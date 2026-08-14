const API_BASE = 'http://localhost:5004/api'; 
let activeCustomerId = null;
let activeCustomerData = null;
let cachedResumeCustomers = new Map(); // Guarda o status IsActive da listagem

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
const formatDate = (isoString) => isoString ? new Date(isoString).toLocaleString('pt-BR') : '--';

document.addEventListener('DOMContentLoaded', () => {
    fetchCustomers();
});

function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = `px-4 py-3 rounded-lg border text-sm font-medium shadow-lg transition-all ${
    isError ? 'bg-red-950 border-red-800 text-red-200' : 'bg-brand-card border-brand text-brand'
    }`;
    toast.innerText = message;
    const container = document.getElementById('toast-container');
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function showCustomersView() {
    document.getElementById('view-customers').classList.remove('hidden');
    document.getElementById('view-details').classList.add('hidden');
    activeCustomerId = null;
    activeCustomerData = null;
    fetchCustomers();
}

function resetToHome() {
    showCustomersView();
}

// Limpa a tela de detalhes para evitar persistência visual de outro cliente
function resetDetailsView() {
    document.getElementById('det-customer-name').innerText = 'Carregando...';
    document.getElementById('det-customer-email').innerText = '';
    document.getElementById('det-wallet-uptodate').innerText = 'R$ 0,00';
    document.getElementById('det-wallet-estimated').innerText = 'R$ 0,00';
    document.getElementById('det-wallet-total').innerText = 'R$ 0,00';
    document.getElementById('det-calc-date').innerText = 'Última atualização: --';
    document.getElementById('assets-table-body').innerHTML = `<tr><td colspan="7" class="p-4 text-center text-gray-500">Nenhum ativo alocado no momento.</td></tr>`;
    document.getElementById('transactions-table-body').innerHTML = `<tr><td colspan="6" class="p-3 text-center text-gray-500">Nenhuma transação registrada.</td></tr>`;
}

// --- CLIENTES API ---

async function fetchCustomers() {
    try {
    const res = await fetch(`${API_BASE}/customer`);
    if (!res.ok) throw new Error("Erro ao buscar a lista de clientes.");
    const customers = await res.json();
    
    // Mapeia o status de cada cliente pelo ID
    cachedResumeCustomers.clear();
    customers.forEach(c => cachedResumeCustomers.set(c.id, c.isActive));

    renderCustomerGrid(customers);
    } catch (err) {
    showToast(err.message, true);
    }
}

function renderCustomerGrid(customers) {
    const container = document.getElementById('customer-grid');
    container.innerHTML = '';

    if (customers.length === 0) {
    container.innerHTML = `<div class="col-span-full text-center py-12 text-gray-500">Nenhum cliente cadastrado.</div>`;
    return;
    }

    customers.forEach(c => {
    const card = document.createElement('div');
    card.className = "bg-brand-card border border-brand-border hover:border-brand/50 rounded-xl p-5 transition cursor-pointer flex justify-between items-center group";
    card.onclick = () => loadCustomerDetail(c.id);

    card.innerHTML = `
        <div class="space-y-1">
        <div class="flex items-center gap-2">
            <h3 class="font-bold text-white group-hover:text-brand transition">${c.name}</h3>
            <span class="inline-block w-2 h-2 rounded-full ${c.isActive ? 'bg-brand shadow-sm shadow-brand' : 'bg-gray-600'}"></span>
        </div>
        <p class="text-xs text-gray-400">ID: ${c.id.substring(0, 8)}...</p>
        </div>
        <span class="text-xs font-semibold px-2.5 py-1 rounded bg-gray-800 text-gray-300 group-hover:bg-brand group-hover:text-black transition">
        Ver Carteira →
        </span>
    `;
    container.appendChild(card);
    });
}

async function loadCustomerDetail(id) {
    activeCustomerId = id;
    resetDetailsView(); // Reseta os dados antes de exibir o novo cliente

    document.getElementById('view-customers').classList.add('hidden');
    document.getElementById('view-details').classList.remove('hidden');

    try {
    const [custRes, summaryRes, txRes] = await Promise.allSettled([
        fetch(`${API_BASE}/customer/${id}`),
        fetch(`${API_BASE}/wallet/${id}/summary`),
        fetch(`${API_BASE}/wallet/${id}/transactions?limit=10`)
    ]);

    if (custRes.status === 'fulfilled' && custRes.value.ok) {
        activeCustomerData = await custRes.value.json();
        
        // Se o CustomerOutDto não retornar isActive, recupera o valor obtido na listagem
        if (activeCustomerData.isActive === undefined) {
        activeCustomerData.isActive = cachedResumeCustomers.get(id) ?? true;
        }
        renderCustomerHeader(activeCustomerData);
    } else {
        throw new Error("Falha ao carregar detalhes do cliente.");
    }

    if (summaryRes.status === 'fulfilled' && summaryRes.value.ok) {
        const walletData = await summaryRes.value.json();
        renderWalletSummary(walletData);
    }

    if (txRes.status === 'fulfilled' && txRes.value.ok) {
        const transactions = await txRes.value.json();
        renderTransactionsTable(transactions);
    }

    } catch (err) {
    showToast(err.message, true);
    }
}

function renderCustomerHeader(cust) {
    document.getElementById('det-customer-name').innerText = cust.name;
    document.getElementById('det-customer-email').innerText = cust.email || 'E-mail não cadastrado';
    
    const statusBadge = document.getElementById('det-customer-status');
    const toggleBtn = document.getElementById('btn-toggle-status');
    const isActive = cust.isActive;

    if (isActive) {
    statusBadge.innerText = 'Ativo';
    statusBadge.className = 'px-2.5 py-0.5 text-xs rounded-full font-medium bg-brand/10 text-brand border border-brand/30';
    toggleBtn.innerText = 'Inativar';
    toggleBtn.className = 'px-3 py-1.5 rounded-lg border text-xs font-semibold bg-red-950/40 border-red-800 text-red-300 hover:bg-red-900/60 transition';
    } else {
    statusBadge.innerText = 'Inativo';
    statusBadge.className = 'px-2.5 py-0.5 text-xs rounded-full font-medium bg-gray-800 text-gray-400 border border-gray-700';
    toggleBtn.innerText = 'Ativar';
    toggleBtn.className = 'px-3 py-1.5 rounded-lg border text-xs font-semibold bg-brand/10 border-brand text-brand hover:bg-brand/20 transition';
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
        tbody.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-gray-500">Nenhum ativo alocado no momento.</td></tr>`;
        return;
    }

    wallet.assetsOut.forEach(asset => {
        const isProfit = asset.profitOrLoss >= 0;
        const tr = document.createElement('tr');
        tr.className = "hover:bg-gray-800/30 transition";
        tr.innerHTML = `
        <td class="p-4 font-bold text-white flex items-center gap-2">
            ${asset.ticker}
            ${!asset.isPriceUpToDate ? '<span class="text-[10px] bg-yellow-900/40 text-yellow-400 border border-yellow-700 px-1 rounded" title="Preço desatualizado">⚠️</span>' : ''}
        </td>
        <td class="p-4">${asset.currentQuantity}</td>
        <td class="p-4">${formatCurrency(asset.averagePrice)}</td>
        
        <td class="p-4 text-gray-300">${formatCurrency(asset.currentAmountInvested)}</td>
        <td class="p-4">${formatCurrency(asset.currentMarketPrice)}</td>
        <td class="p-4 font-semibold text-white">${formatCurrency(asset.totalCurrentValue)}</td>
        <td class="p-4 font-semibold ${isProfit ? 'text-brand' : 'text-red-400'}">
            ${formatCurrency(asset.profitOrLoss)}
        </td>
        <td class="p-4">
            <span class="px-2 py-0.5 rounded text-xs font-bold ${isProfit ? 'bg-brand/10 text-brand' : 'bg-red-950/50 text-red-400'}">
            ${isProfit ? '+' : ''}${asset.returnPercentage ? asset.returnPercentage.toFixed(2) : '0.00'}%
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
    tbody.innerHTML = `<tr><td colspan="6" class="p-3 text-center text-gray-500">Nenhuma transação registrada.</td></tr>`;
    return;
    }

    transactions.forEach(t => {
    const isBuy = t.transactionType === 0 || t.transactionType === 'BUY';
    const tr = document.createElement('tr');
    tr.className = "hover:bg-gray-800/30 transition";
    tr.innerHTML = `
        <td class="p-3 text-xs text-gray-400">${formatDate(t.transactionDate)}</td>
        <td class="p-3">
        <span class="text-[10px] font-bold px-2 py-0.5 rounded ${isBuy ? 'bg-blue-900/40 text-blue-300 border border-blue-700' : 'bg-purple-900/40 text-purple-300 border border-purple-700'}">
            ${isBuy ? 'COMPRA' : 'VENDA'}
        </span>
        </td>
        <td class="p-3 font-semibold text-white">${t.ticker}</td>
        <td class="p-3">${t.quantity}</td>
        <td class="p-3">${formatCurrency(t.unitPrice)}</td>
        <td class="p-3 font-semibold text-white">${formatCurrency(t.quantity * t.unitPrice)}</td>
    `;
    tbody.appendChild(tr);
    });
}

// --- AÇÕES ---

async function toggleCustomerStatus() {
    if (!activeCustomerId || !activeCustomerData) return;
    const isCurrentlyActive = activeCustomerData.isActive;
    const action = isCurrentlyActive ? 'inactivate' : 'activate';

    try {
    const res = await fetch(`${API_BASE}/customer/${action}/${activeCustomerId}`, { method: 'PUT' });
    if (!res.ok) throw new Error("Erro ao alterar o status do cliente.");
    
    // Atualiza cache e estado atual
    cachedResumeCustomers.set(activeCustomerId, !isCurrentlyActive);
    activeCustomerData.isActive = !isCurrentlyActive;
    renderCustomerHeader(activeCustomerData);

    showToast(`Cliente ${!isCurrentlyActive ? 'ativado' : 'inativado'} com sucesso!`);
    } catch (err) {
    showToast(err.message, true);
    }
}

function openCustomerModal() {
    document.getElementById('form-customer').reset();
    document.getElementById('modal-customer').classList.remove('hidden');
}

function closeCustomerModal() {
    document.getElementById('modal-customer').classList.add('hidden');
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
    closeCustomerModal();
    fetchCustomers();
    } catch (err) {
    showToast(err.message, true);
    }
}

function openTransactionModal() {
    document.getElementById('form-transaction').reset();
    document.getElementById('modal-transaction').classList.remove('hidden');
}

function closeTransactionModal() {
    document.getElementById('modal-transaction').classList.add('hidden');
}

async function handleRecordTransaction(e) {
    e.preventDefault();
    if (!activeCustomerId) return;

    const payload = {
    ticker: document.getElementById('tx-ticker').value.toUpperCase(),
    quantity: parseInt(document.getElementById('tx-quantity').value),
    unitPrice: parseFloat(document.getElementById('tx-price').value),
    transactionType: document.getElementById('tx-type').value
    };

    try {
    const res = await fetch(`${API_BASE}/wallet/${activeCustomerId}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.mensagem || "Erro ao registrar a transação.");
    }

    showToast("Transação registrada com sucesso!");
    closeTransactionModal();
    loadCustomerDetail(activeCustomerId);
    } catch (err) {
    showToast(err.message, true);
    }
}
// Função para gerar relatório de impressão customizado em nova janela
function printSection(type) {
if (!activeCustomerData) {
showToast("Nenhum cliente selecionado para impressão.", true);
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
    <h2 style="font-size: 18px; margin-top: 0; border-bottom: 2px solid #059669; padding-bottom: 5px;">Relatório de Posição Consolidada</h2>
    
    <div style="display: flex; gap: 15px; margin: 20px 0;">
    <div style="flex: 1; border: 1px solid #ccc; padding: 12px; border-radius: 6px; background: #f9fafb;">
        <div style="font-size: 11px; text-transform: uppercase; color: #666; font-weight: bold;">Investimento Total</div>
        <div style="font-size: 20px; font-weight: bold; color: #059669;">${total}</div>
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
    <thead>
        <tr style="background: #ecfdf5; border-bottom: 2px solid #10b981;">
        <th style="padding: 8px;">Ticker</th>
        <th style="padding: 8px;">Qtd.</th>
        <th style="padding: 8px;">Preço Médio</th>
        <th style="padding: 8px;">Investido</th>
        <th style="padding: 8px;">Preço Atual</th>
        <th style="padding: 8px;">Valor Atual</th>
        <th style="padding: 8px;">Lucro / Prejuízo</th>
        <th style="padding: 8px;">Retorno</th>
        </tr>
    </thead>
    <tbody>
        ${assetsTable}
    </tbody>
    </table>
`;
} else if (type === 'transactions') {
const txTable = document.getElementById('transactions-table-body').innerHTML;

contentHtml = `
    <h2 style="font-size: 18px; margin-top: 0; border-bottom: 2px solid #059669; padding-bottom: 5px;">Histórico de Transações</h2>
    <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; margin-top: 15px;">
    <thead>
        <tr style="background: #ecfdf5; border-bottom: 2px solid #10b981;">
        <th style="padding: 8px;">Data</th>
        <th style="padding: 8px;">Tipo</th>
        <th style="padding: 8px;">Ticker</th>
        <th style="padding: 8px;">Qtd.</th>
        <th style="padding: 8px;">Preço Unitário</th>
        <th style="padding: 8px;">Total</th>
        </tr>
    </thead>
    <tbody>
        ${txTable}
    </tbody>
    </table>
`;
}

// Cria a janela de impressão limpa em preto/branco com formatação clara para papel
const printWindow = window.open('', '_blank', 'width=900,height=700');
printWindow.document.write(`
<!DOCTYPE html>
<html>
    <head>
    <title>Relatório - ${customerName}</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 25px; color: #111; }
        .header { border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 20px; }
        table td { padding: 8px; border-bottom: 1px solid #e5e7eb; }
        @media print {
        body { padding: 0; }
        button { display: none; }
        }
    </style>
    </head>
    <body>
    <div class="header">
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
        <h1 style="margin: 0; font-size: 22px;">Carteira de Investimentos</h1>
        <span style="font-size: 12px; color: #666;">Emitido em: ${printDate}</span>
        </div>
        <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Cliente:</strong> ${customerName} | <strong>E-mail:</strong> ${customerEmail}</p>
    </div>
    ${contentHtml}
    </body>
</html>
`);

printWindow.document.close();
printWindow.focus();
setTimeout(() => {
printWindow.print();
printWindow.close();
}, 250);
}