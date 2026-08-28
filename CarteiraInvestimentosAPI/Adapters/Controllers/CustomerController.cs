using CarteiraInvestimentosAPI.Domain.Services.Ports;
using CarteiraInvestimentosAPI.Dtos;
using CarteiraInvestimentosAPI.Dtos.CustomersDtos;
using Microsoft.AspNetCore.Mvc;

namespace CarteiraInvestimentosAPI.Adapters.Controllers;

[Route("api/customer")]
[ApiController]
public class CustomerController(ICustomerService customerService) : ControllerBase
{
    private readonly ICustomerService _customerService = customerService;
    
    [HttpPost]
    public async Task<IActionResult> AddCustomer(CustomerInputDto customer)
    {
        var newCustomer = await _customerService.AddCustomerAsync(customer);
        return CreatedAtAction(nameof(GetCustomer), new {id = newCustomer.Id}, newCustomer);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetCustomer(Guid id)
    {
        var customerOutDto = await _customerService.GetCustomer(id);
        return Ok(customerOutDto);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateCustomer(Guid id, CustomerInputDto newCustomerData)
    {
        var customer = await _customerService.UpdateCustomerInformation(id, newCustomerData);
        return Ok(customer);
    }

    [HttpPut("inactivate/{id:guid}")]
    public async Task<IActionResult> InactivateCustomer(Guid id)
    {
        var inactiveCustomer = await _customerService.InactivateCustomer(id);
        return Ok(inactiveCustomer);
    }

    [HttpPut("activate/{id:guid}")]
    public async Task<IActionResult> ActivateCustomer(Guid id)
    {
        var activeCustomer = await _customerService.ActivateCustomer(id);
        return Ok(activeCustomer);
    }

    [HttpGet]
    public async Task<IActionResult> ListCustomers()
    {
        List<CustomerOutResumeDto> customers = await _customerService.ListCustomersAsync();
        return Ok(customers);
    }
    
    // Chamada utilizada para testes e debug:

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteCustomer(Guid id)
    {
        await _customerService.DeleteCustomerAsync(id);
        return NoContent();
    }
}