using System.Text.RegularExpressions;
using CarteiraInvestimentosAPI.Domain.Entities.Enums;
using CarteiraInvestimentosAPI.Domain.Exceptions;

namespace CarteiraInvestimentosAPI.Domain.Entities;

public partial class Transaction
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid CustomerId { get; private set; }
    public DateTime TransactionDate { get; private set; } = DateTime.UtcNow;

    public TransactionType TransactionType { get; private set; }
    public int Quantity { get; private set; }
    public decimal UnitPrice { get; private set; } 
    public string Ticker { get; private set; }
    
    public Transaction(
        Guid customerId,
        TransactionType transactionType,
        int quantity,
        decimal unitPrice,
        string ticker)
    {
        if (quantity <= 0)
            throw new ArgumentException("A quantidade de cotas deve ser maior que zero.");

        if (unitPrice <= 0)
            throw new ArgumentException("O preço unitário deve ser maior que zero.");

        if (quantity * unitPrice > 100_000_000m)
            throw new ArgumentException("O volume financeiro da transação excede o limite de segurança de R$ 100.000.000,00.");
        
        if (string.IsNullOrWhiteSpace(ticker) || !MyRegex().IsMatch(ticker))
            throw new ArgumentException("O Ticker informado é inválido. Padrão esperado: 4 letras seguidas de 1 ou 2 números.");

        CustomerId = customerId;
        TransactionType = transactionType;
        Quantity = quantity;
        UnitPrice = unitPrice;
        Ticker = ticker.Trim().ToUpper();
    }
    
    [GeneratedRegex(@"^[a-zA-Z]{4}\d{1,2}$")]
    private static partial Regex MyRegex();
}