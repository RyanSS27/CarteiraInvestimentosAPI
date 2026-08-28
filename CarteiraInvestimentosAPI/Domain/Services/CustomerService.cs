using CarteiraInvestimentosAPI.Adapters.Infrastructure.Repositories;
using CarteiraInvestimentosAPI.Domain.Entities;
using CarteiraInvestimentosAPI.Domain.Services.Ports;
using CarteiraInvestimentosAPI.Dtos;
using CarteiraInvestimentosAPI.Dtos.CustomersDtos;
using CarteiraInvestimentosAPI.Domain.Exceptions; // Assumindo o namespace da sua exception

namespace CarteiraInvestimentosAPI.Domain.Services;

public class CustomerService(ICustomerRepository customerRepository) : ICustomerService
{
    public async Task<CustomerOutDto> AddCustomerAsync(CustomerInputDto newCustomer)
    {
        var customer = new Customer(newCustomer.Name, newCustomer.Email);
        await customerRepository.AddCustomerAsync(customer);

        return new CustomerOutDto(customer);
    }

    public async Task<CustomerOutDto> GetCustomer(Guid customerId)
    {
        var customer = await customerRepository.GetCustomerAsync(customerId);
        if (customer is null)
            throw new NotFoundException($"Cliente de id '{customerId}' não encontrado.");
        
        return new CustomerOutDto(customer);
    }

    public async Task<CustomerOutDto> UpdateCustomerInformation(Guid customerId, CustomerInputDto newCustomerData)
    {
        var customer = await customerRepository.GetCustomerAsync(customerId);
        if (customer is null)
            throw new NotFoundException($"Cliente de id '{customerId}' não encontrado.");

        customer.Name = newCustomerData.Name;
        customer.Email = newCustomerData.Email;
        await customerRepository.UpdateCustomerAsync(customer);
        
        return new CustomerOutDto(customer);
    }

    public async Task<CustomerOutResumeDto> InactivateCustomer(Guid customerId)
    {
        var customer = await customerRepository.GetCustomerAsync(customerId);
        if (customer is null)
            throw new NotFoundException($"Cliente de id '{customerId}' não encontrado.");
        
        customer.InactivateAccount();
        await customerRepository.UpdateCustomerAsync(customer);
        
        return new CustomerOutResumeDto(customer);
    }

    public async Task<CustomerOutDto> ActivateCustomer(Guid customerId)
    {
        var customer = await customerRepository.GetCustomerAsync(customerId);
        if (customer is null)
            throw new NotFoundException($"Cliente de id '{customerId}' não encontrado.");

        customer.ActivateAccount();
        await customerRepository.UpdateCustomerAsync(customer);

        return new CustomerOutDto(customer);
    }

    // Funções utilizadas apenas para testes:
    public async Task<List<CustomerOutResumeDto>> ListCustomersAsync()
    {
        var customerResume = await customerRepository.ListCustomerSummariesAsync();
        
        return customerResume
            .Select(c => new CustomerOutResumeDto(c.Id, c.Name, c.IsActive))
            .ToList();
    }

    public async Task DeleteCustomerAsync(Guid customerId)
    {
        await customerRepository.DeleteCustomerAsync(customerId);
    }
}