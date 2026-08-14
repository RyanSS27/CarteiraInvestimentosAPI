using CarteiraInvestimentosAPI.Domain.Entities;

namespace CarteiraInvestimentosAPI.Dtos.CustomersDtos;

public record CustomerOutDto
{
    public Guid Id { get; set; }
    public string Name { get; set; }
    public string? Email { get; set; }
    public bool IsActive { get; set; }
    
    public CustomerOutDto(Customer customer)
    {
            Id = customer.Id;
            Name = customer.Name;
            Email = customer.Email;
            IsActive = customer.IsActive;
    }
}