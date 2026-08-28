const API_BASE = 'http://localhost:5004/api'; 
let activeCustomerData = null;
let currentTransactionPage = 1; 
const transactionLimit = 10;

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
const formatDate = (isoString) => isoString ? new Date(isoString).toLocaleString('pt-BR') : '--';

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('customer-grid')) {
        fetchCustomers();
    } else if (document.getElementById('det-customer-name')) {
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');
        if (id) {
            loadCustomerDetail(id);
        } else {
            window.location.href = 'index.html';
        }
    }
});

// --- UTILITÁRIOS ---

function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'error' : 'success'}`;
    toast.innerText = message;
    const container = document.getElementById('toast-container');
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function openModal(modalId) {
    const formId = modalId === 'modal-customer' ? 'form-customer' : 'form-transaction';
    document.getElementById(formId).reset();
    document.getElementById(modalId).classList.add('show');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

const btnBackToTop = document.getElementById('btn-back-to-top');
if (btnBackToTop) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            btnBackToTop.classList.add('show');
        } else {
            btnBackToTop.classList.remove('show');
        }
    });
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- INDEX.HTML LOGIC ---

async function fetchCustomers() {
    try {
        const res = await fetch(`${API_BASE}/customer`);
        if (!res.ok) throw new Error("Erro ao buscar a lista de clientes.");
        const customers = await res.json();
        renderCustomerGrid(customers);
    } catch (err) {
        showToast(err.message, true);
    }
}

function renderCustomerGrid(customers) {
    const container = document.getElementById('customer-grid');
    if (!container) return;
    container.innerHTML = '';

    if (customers.length === 0) {
        container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 40px 0;">Nenhum cliente cadastrado.</div>`;
        return;
    }

    customers.forEach(c => {
        const card = document.createElement('div');
        card.className = "card card-hover";
        card.onclick = () => window.location.href = `detalhes.html?id=${c.id}`;

        card.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <h3 style="font-weight: bold; color: white;">${c.name}</h3>
            <span class="dot ${c.isActive ? 'active' : 'inactive'}"></span>
        </div>
        <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">ID: ${c.id.substring(0, 8)}...</p>
        <span class="btn-view-wallet">Ver Carteira →</span>
    `;
        container.appendChild(card);
    });
}

async function handleSaveCustomer(e) {
    e.preventDefault();
    const payload = {
        name: document.getElementById('cust-name').value,
        email: document.getElementById('cust-email').value
    };

    try {
        const res = await fetch(`${API_BASE}/customer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Erro ao criar o cliente.");
        showToast("Cliente registrado com sucesso!");
        closeModal('modal-customer');
        fetchCustomers();
    } catch (err) {
        showToast(err.message, true);
    }
}

// --- DETALHES.HTML LOGIC ---

async function loadCustomerDetail(id) {
    try {
        currentTransactionPage = 1; 

        const [custRes, summaryRes, txRes] = await Promise.allSettled([
            fetch(`${API_BASE}/customer/${id}`),
            fetch(`${API_BASE}/wallet/${id}/summary`),
            fetch(`${API_BASE}/wallet/${id}/transactions?page=${currentTransactionPage}&limit=${transactionLimit}`) 
        ]);

        if (custRes.status === 'fulfilled' && custRes.value.ok) {
            activeCustomerData = await custRes.value.json();
            if (activeCustomerData.isActive === undefined) activeCustomerData.isActive = true; 
            renderCustomerHeader(activeCustomerData);
        }

        if (summaryRes.status === 'fulfilled' && summaryRes.value.ok) {
            const walletData = await summaryRes.value.json();
            renderWalletSummary(walletData);
        }

        if (txRes.status === 'fulfilled' && txRes.value.ok) {
            const transactions = await txRes.value.json();
            renderTransactionsTable(transactions);
            updatePaginationControls(transactions.length); 
        }
    } catch (err) {
        showToast(err.message, true);
    }
}

function renderCustomerHeader(cust) {
    document.getElementById('det-customer-name').innerText = cust.name;
    document.getElementById('det-customer-email').innerText = cust.email || 'E-mail não cadastrado';
    
    const statusBadge = document.getElementById('det-customer-status');

    if (cust.isActive) {
        statusBadge.innerText = 'Ativo';
        statusBadge.className = 'badge active';
    } else {
        statusBadge.innerText = 'Inativo';
        statusBadge.className = 'badge inactive';
    }
}

function renderWalletSummary(wallet) {
    if (!wallet) return;

    document.getElementById('det-wallet-uptodate').innerText = formatCurrency(wallet.totalValueUpToDate);
    document.getElementById('det-wallet-estimated').innerText = formatCurrency(wallet.totalValueEstimated);
    document.getElementById('det-wallet-total').innerText = formatCurrency(wallet.totalValue);
    document.getElementById('det-calc-date').innerText = `Atualizado em: ${formatDate(wallet.calculationDate)}`;

    const tbody = document.getElementById('assets-table-body');
    tbody.innerHTML = '';

    if (!wallet.assetsOut || wallet.assetsOut.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">Nenhum ativo alocado no momento.</td></tr>`;
        return;
    }

    wallet.assetsOut.forEach(asset => {
        const upToDate = asset.isPriceUpToDate;
        const isProfit = asset.profitOrLoss >= 0;

        const rowClass = !upToDate ? "row-faded" : "";
        const alertColorText = "var(--warning)";
        
        const priceColor = !upToDate ? alertColorText : "inherit";
        const profitColor = !upToDate ? alertColorText : (isProfit ? "var(--brand)" : "var(--danger)");
        const returnBadgeClass = !upToDate ? "badge warning" : (isProfit ? "badge active" : "badge inactive");

        const tr = document.createElement('tr');
        tr.className = rowClass;
        tr.innerHTML = `
            <td style="font-weight: bold; color: white;">
                ${asset.ticker}
                ${!upToDate ? '<span style="font-size:10px; background:var(--warning-bg); color:var(--warning); padding:2px 4px; border-radius:4px; margin-left:4px;">⚠️</span>' : ''}
            </td>
            <td>${asset.currentQuantity}</td>
            <td>${formatCurrency(asset.averagePrice)}</td>
            <td style="color: var(--text-muted);">${formatCurrency(asset.currentAmountInvested)}</td>
            <td style="font-weight: bold; color: ${priceColor};">${formatCurrency(asset.currentMarketPrice)}</td>
            <td style="font-weight: bold; color: white;">${formatCurrency(asset.totalCurrentValue)}</td>
            <td style="font-weight: bold; color: ${profitColor};">
                ${formatCurrency(asset.profitOrLoss)}
            </td>
            <td>
                <span class="${returnBadgeClass}">
                    ${!upToDate ? '0.00%' : (isProfit ? '+' : '') + (asset.returnPercentage ? asset.returnPercentage.toFixed(2) : '0.00') + '%'}
                </span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderTransactionsTable(transactions) {
    const tbody = document.getElementById('transactions-table-body');
    tbody.innerHTML = '';

    if (!transactions || transactions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Nenhuma transação registrada.</td></tr>`;
        return;
    }

    transactions.forEach(t => {
        const isBuy = t.transactionType === 0 || t.transactionType === 'BUY';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-size: 12px; color: var(--text-muted);">${formatDate(t.transactionDate)}</td>
            <td>
                <span class="badge" style="${isBuy ? 'background: rgba(37, 99, 235, 0.2); color: #60a5fa;' : 'background: rgba(147, 51, 234, 0.2); color: #c084fc;'}">
                    ${isBuy ? 'COMPRA' : 'VENDA'}
                </span>
            </td>
            <td style="font-weight: bold; color: white;">${t.ticker}</td>
            <td>${t.quantity}</td>
            <td>${formatCurrency(t.unitPrice)}</td>
            <td style="font-weight: bold; color: white;">${formatCurrency(t.quantity * t.unitPrice)}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function handleRecordTransaction(e) {
    e.preventDefault();
    if (!activeCustomerData) return;

    const payload = {
        ticker: document.getElementById('tx-ticker').value.toUpperCase(),
        quantity: parseInt(document.getElementById('tx-quantity').value),
        unitPrice: parseFloat(document.getElementById('tx-price').value),
        transactionType: document.getElementById('tx-type').value
    };

    try {
        const res = await fetch(`${API_BASE}/wallet/${activeCustomerData.id}/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => null);
            throw new Error(errData?.mensagem || "Erro ao registrar a transação.");
        }

        showToast("Transação registrada com sucesso!");
        closeModal('modal-transaction');
        loadCustomerDetail(activeCustomerData.id);
    } catch (err) {
        showToast(err.message, true);
    }
}

function printSection(type) {
    if (!activeCustomerData) {
        showToast("Nenhum cliente selecionado.", true);
        return;
    }
    const customerName = activeCustomerData.name;
    const customerEmail = activeCustomerData.email || 'Não informado';
    const printDate = new Date().toLocaleString('pt-BR');
    let contentHtml = '';

    if (type === 'wallet') {
        const total = document.getElementById('det-wallet-total').innerText;
        const upToDate = document.getElementById('det-wallet-uptodate').innerText;
        const estimated = document.getElementById('det-wallet-estimated').innerText;
        const calcDate = document.getElementById('det-calc-date').innerText;
        const assetsTable = document.getElementById('assets-table-body').innerHTML;

        contentHtml = `
            <h2 style="font-size: 18px; margin-top: 0; border-bottom: 2px solid #10b981; padding-bottom: 5px;">Relatório de Posição Consolidada</h2>
            <div style="display: flex; gap: 15px; margin: 20px 0;">
                <div style="flex: 1; border: 1px solid #ccc; padding: 12px; border-radius: 6px; background: #f9fafb;">
                    <div style="font-size: 11px; text-transform: uppercase; color: #666; font-weight: bold;">Investimento Total</div>
                    <div style="font-size: 20px; font-weight: bold; color: #10b981;">${total}</div>
                </div>
                <div style="flex: 1; border: 1px solid #ccc; padding: 12px; border-radius: 6px;">
                    <div style="font-size: 11px; text-transform: uppercase; color: #666;">Patrimônio Atualizado</div>
                    <div style="font-size: 18px; font-weight: bold;">${upToDate}</div>
                </div>
                <div style="flex: 1; border: 1px solid #ccc; padding: 12px; border-radius: 6px;">
                    <div style="font-size: 11px; text-transform: uppercase; color: #666;">Valor Estimado</div>
                    <div style="font-size: 18px; font-weight: bold;">${estimated}</div>
                </div>
            </div>
            <div style="font-size: 11px; color: #666; margin-bottom: 8px;">${calcDate}</div>
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12px;">
                <thead style="color: #065f46;">
                    <tr style="background: #ecfdf5; border-bottom: 2px solid #10b981;">
                        <th style="padding: 8px;">Ticker</th><th style="padding: 8px;">Qtd.</th><th style="padding: 8px;">Preço Médio</th>
                        <th style="padding: 8px;">Investido</th><th style="padding: 8px;">Preço Atual</th><th style="padding: 8px;">Valor Atual</th>
                        <th style="padding: 8px;">Lucro / Prejuízo</th><th style="padding: 8px;">Retorno</th>
                    </tr>
                </thead>
                <tbody>${assetsTable}</tbody>
            </table>
        `;
    } else if (type === 'transactions') {
        const txTable = document.getElementById('transactions-table-body').innerHTML;
        contentHtml = `
            <h2 style="font-size: 18px; margin-top: 0; border-bottom: 2px solid #10b981; padding-bottom: 5px;">Histórico de Transações</h2>
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; margin-top: 15px;">
                <thead style="color: #065f46;">
                    <tr style="background: #ecfdf5; border-bottom: 2px solid #10b981;">
                        <th style="padding: 8px;">Data</th><th style="padding: 8px;">Tipo</th><th style="padding: 8px;">Ticker</th>
                        <th style="padding: 8px;">Qtd.</th><th style="padding: 8px;">Preço Unitário</th><th style="padding: 8px;">Total</th>
                    </tr>
                </thead>
                <tbody>${txTable}</tbody>
            </table>
        `;
    }

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    printWindow.document.write(`
        <!DOCTYPE html><html><head><title>Relatório - ${customerName}</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 25px; color: #111; }
            .header { border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 20px; }
            table td { padding: 8px; border-bottom: 1px solid #e5e7eb; }
            @media print { body { padding: 0; } button { display: none; } }
        </style></head><body>
            <div class="header">
                <div style="display: flex; justify-content: space-between; align-items: baseline;">
                    <h1 style="margin: 0; font-size: 22px;">Carteira de Investimentos</h1>
                    <span style="font-size: 12px; color: #666;">Emitido em: ${printDate}</span>
                </div>
                <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Cliente:</strong> ${customerName} | <strong>E-mail:</strong> ${customerEmail}</p>
            </div>
            ${contentHtml}
        </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
}

// --- LÓGICA DE PAGINAÇÃO DE TRANSAÇÕES ---

async function changeTransactionPage(direction) {
    if (!activeCustomerData) return;
    
    const newPage = currentTransactionPage + direction;
    if (newPage < 1) return; 
    
    try {
        const res = await fetch(`${API_BASE}/wallet/${activeCustomerData.id}/transactions?page=${newPage}&limit=${transactionLimit}`);
        if (!res.ok) throw new Error("Erro ao buscar transações.");
        
        const transactions = await res.json();
        
        if (direction === 1 && transactions.length === 0) {
            document.getElementById('btn-next-page').disabled = true;
            return;
        }
        
        currentTransactionPage = newPage;
        renderTransactionsTable(transactions);
        updatePaginationControls(transactions.length);
    } catch (err) {
        showToast(err.message, true);
    }
}

function updatePaginationControls(currentTxCount) {
    const btnPrev = document.getElementById('btn-prev-page');
    const btnNext = document.getElementById('btn-next-page');
    const indicator = document.getElementById('page-indicator');
    
    if (btnPrev) btnPrev.disabled = currentTransactionPage === 1;
    
    if (btnNext) btnNext.disabled = currentTxCount < transactionLimit; 
    
    if (indicator) indicator.innerText = `Página ${currentTransactionPage}`;
}

function openEditCustomerModal() {
    if (!activeCustomerData) return;
    
    document.getElementById('edit-cust-name').value = activeCustomerData.name;
    document.getElementById('edit-cust-email').value = activeCustomerData.email || '';
    
    // Converte o booleano para string para marcar a option correta no select
    document.getElementById('edit-cust-status').value = activeCustomerData.isActive ? "true" : "false";
    
    document.getElementById('modal-edit-customer').classList.add('show');
}

async function handleEditCustomer(e) {
    e.preventDefault();
    if (!activeCustomerData) return;

    const newName = document.getElementById('edit-cust-name').value;
    const newEmail = document.getElementById('edit-cust-email').value;
    const newStatus = document.getElementById('edit-cust-status').value === "true"; // Converte de volta para booleano

    const payload = {
        name: newName,
        email: newEmail
    };

    try {
        // 1. Atualiza os dados cadastrais básicos
        const resInfo = await fetch(`${API_BASE}/customer/${activeCustomerData.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!resInfo.ok) {
            const errData = await resInfo.json().catch(() => null);
            throw new Error(errData?.mensagem || "Erro ao atualizar os dados do cliente.");
        }

        const updatedCustomer = await resInfo.json();
        activeCustomerData.name = updatedCustomer.name;
        activeCustomerData.email = updatedCustomer.email;

        // 2. Orquestração: Se o status foi alterado no modal, dispara a chamada para a rota correspondente
        if (newStatus !== activeCustomerData.isActive) {
            const action = newStatus ? 'activate' : 'inactivate';
            const resStatus = await fetch(`${API_BASE}/customer/${action}/${activeCustomerData.id}`, { method: 'PUT' });
            
            if (!resStatus.ok) {
                throw new Error("Dados salvos, mas houve um erro ao alterar o status do cliente.");
            }
            activeCustomerData.isActive = newStatus;
        }

        // Atualiza a UI com os novos dados e status
        renderCustomerHeader(activeCustomerData);
        
        showToast("Cliente atualizado com sucesso!");
        closeModal('modal-edit-customer');
    } catch (err) {
        showToast(err.message, true);
    }
}