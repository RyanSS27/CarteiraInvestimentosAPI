using CarteiraInvestimentosAPI.Database;
using CarteiraInvestimentosAPI.Domain.Entities;
using MongoDB.Driver;

namespace CarteiraInvestimentosAPI.Adapters.Infrastructure.Repositories;

public class TransactionRepository : ITransactionRepository
{
    private readonly IMongoCollection<Transaction> _transactionCollection;

    public TransactionRepository(IMongoClient mongoClient, IConfiguration configuration)
    {
        var databaseName = configuration.GetValue<string>("CarteiraInvestimentosAPI:DatabaseName");
        var collectionName = configuration.GetValue<string>("CarteiraInvestimentosAPI:TransactionsCollectionName");

        var database = mongoClient.GetDatabase(databaseName);
        _transactionCollection = database.GetCollection<Transaction>(collectionName);
    }

    public async Task AddTransactionAsync(Transaction transaction)
    {
        await _transactionCollection.InsertOneAsync(transaction);
    }

    public async Task<List<Transaction>> ListTransactionsAsync(Guid customerId, int skip, int limit)
    {
        return await _transactionCollection
            .Find(t => t.CustomerId == customerId)
            .SortByDescending(t => t.TransactionDate)
            .Skip(skip)
            .Limit(limit)
            .ToListAsync();
    }
}