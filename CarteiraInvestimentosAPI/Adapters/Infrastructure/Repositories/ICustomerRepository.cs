using CarteiraInvestimentosAPI.Domain.Entities;

namespace CarteiraInvestimentosAPI.Adapters.Infrastructure.Repositories;

public interface ICustomerRepository
{
    public Task AddCustomerAsync(Customer customer);
    public Task<Customer?> GetCustomerAsync(Guid customerId);
    public Task UpdateCustomerAsync(Customer customer);

    // Funções utilizadas apenas para testes:
    public Task<List<CustomerSummary>> ListCustomerSummariesAsync();
    public Task DeleteCustomerAsync(Guid customerId);
}