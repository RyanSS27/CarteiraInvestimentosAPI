using CarteiraInvestimentosAPI.Domain.Entities;

namespace CarteiraInvestimentosAPI.Database;

public interface ITransactionRepository
{
    public Task AddTransactionAsync(Transaction transaction);
    Task<List<Transaction>> ListTransactionsAsync(Guid customerId, int skip, int limit);
}