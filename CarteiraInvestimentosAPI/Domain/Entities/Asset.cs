using System.Text.RegularExpressions;
using CarteiraInvestimentosAPI.Domain.Exceptions;

namespace CarteiraInvestimentosAPI.Domain.Entities;

public partial class Asset
{
    public string Ticker { get; private set; }

    public int Quantity { get; private set; } 

    public decimal AveragePrice { get; private set; }  
    /*
        Valor atribuido direto na 1° compra e nas próximas transações carrega a média do valor 
        pago por aquela ação
    */

    public decimal CurrentAmountInvested => Quantity * AveragePrice;

    private decimal TotalAcquisitionCost { get; set; } // acumula o valor total gasto na compra dessas ações

    public Asset(string ticker, int quantity, decimal averagePrice)
    {
        if (string.IsNullOrWhiteSpace(ticker) || !MyRegex().IsMatch(ticker))
            throw new ArgumentException("O Ticker informado é inválido. Padrão B3 esperado: 4 letras seguidas de 1 ou 2 números (ex: PETR4).");

        if (quantity <= 0)
            throw new ArgumentException("A quantidade de cotas deve ser maior que zero.");

        if (averagePrice <= 0)
            throw new ArgumentException("O preço médio deve ser maior que zero.");

        if (quantity * averagePrice > 100_000_000m)
            throw new ArgumentException("O volume financeiro inicial excede o limite de segurança de R$ 100.000.000,00.");
        
        Ticker = ticker.Trim().ToUpper();
        Quantity = quantity;
        AveragePrice = averagePrice;
        TotalAcquisitionCost = quantity * averagePrice;
    }
    
    public void RegisterBuy(int quantity, decimal unitPrice)
    {
        if (unitPrice <= 0 || quantity <= 0)
            throw new DomainException("Tanto Quantidade quanto Preço Unitário devem ser maiores que zero."); 

        if (quantity * unitPrice > 100_000_000m)
            throw new DomainException("O volume financeiro da compra excede o limite de segurança de R$ 100.000.000,00.");

        TotalAcquisitionCost += quantity * unitPrice;
        
        Quantity += quantity;
        AveragePrice = Math.Round(TotalAcquisitionCost / Quantity, 2);
    }

    public void RegisterSell(int quantity)
    {
        if (quantity <= 0)
            throw new DomainException("Quantidade deve ser maior que zero.");
        if (quantity > Quantity)
            throw new DomainException($"Não há estoque de ações {Ticker} suficientes. Estoque atual: {Quantity}.");
        
        Quantity -= quantity;
        TotalAcquisitionCost = Quantity * AveragePrice;
    }

    [GeneratedRegex(@"^[a-zA-Z]{4}\d{1,2}$")]
    private static partial Regex MyRegex();
}