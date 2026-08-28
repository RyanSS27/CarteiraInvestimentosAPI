using CarteiraInvestimentosAPI.Domain.Entities;
using MongoDB.Driver;
using CarteiraInvestimentosAPI.Domain.Exceptions;

namespace CarteiraInvestimentosAPI.Adapters.Infrastructure.Repositories;

public class CustomerRepository : ICustomerRepository
{
    private readonly IMongoCollection<Customer> _customersCollection;

    public CustomerRepository(IMongoClient mongoClient, IConfiguration configuration)
    {
        var databaseName = configuration.GetValue<string>("CarteiraInvestimentosAPI:DatabaseName");
        var collectionName = configuration.GetValue<string>("CarteiraInvestimentosAPI:CustomersCollectionName");

        var database = mongoClient.GetDatabase(databaseName);

        _customersCollection = database.GetCollection<Customer>(collectionName);
    }

    public async Task<List<CustomerSummary>> ListCustomerSummariesAsync()
    {
        return await _customersCollection
            .Find(_ => true) // Retorna todos
            .SortByDescending(c => c.IsActive) 
            .Project(c => new CustomerSummary(c.Id, c.Name, c.IsActive)) // Limita os dados tragos 
            .ToListAsync();
    }

    public async Task AddCustomerAsync(Customer customer)
    {
        await _customersCollection.InsertOneAsync(customer);
    }

    public async Task<Customer?> GetCustomerAsync(Guid customerId)
    {
        return await _customersCollection.Find(c => c.Id == customerId).FirstOrDefaultAsync();
    }

    public async Task UpdateCustomerAsync(Customer customer)
    {
        await _customersCollection.ReplaceOneAsync(c => c.Id == customer.Id, customer);
    }

    public async Task DeleteCustomerAsync(Guid customerId)
    {
        var result = await _customersCollection.DeleteOneAsync(c => c.Id == customerId);
        if (result.DeletedCount == 0)
            throw new NotFoundException($"Cliente de id '{customerId}' não encontrado para exclusão.");
    }
}