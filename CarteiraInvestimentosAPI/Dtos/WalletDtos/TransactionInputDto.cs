using System.ComponentModel.DataAnnotations;
using CarteiraInvestimentosAPI.Domain.Entities.Enums;

namespace CarteiraInvestimentosAPI.Dtos;

public record TransactionInputDto(
    [Required(ErrorMessage = "O Ticker é obrigatório.")]
    [RegularExpression(@"^[a-zA-Z]{4}\d{1,2}$", ErrorMessage = "O Ticker deve seguir o formato da B3 (ex: PETR4).")]
    string Ticker,
    
    [Required(ErrorMessage = "A quantidade é obrigatória.")]
    [Range(1, 100_000_000, ErrorMessage = "A quantidade deve ser entre 1 e 100.000.000.")]
    int Quantity,
    
    [Required(ErrorMessage = "O preço unitário é obrigatório.")]
    [Range(0.01, 100_000_000, ErrorMessage = "O preço unitário deve ser entre 0,01 e 100.000.000,00.")]
    decimal UnitPrice,
    
    [Required(ErrorMessage = "O tipo da transação é obrigatório. Valores válidos: 'BUY' / 'SELL'.")]
    TransactionType TransactionType
) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Quantity * UnitPrice > 100_000_000m)
        {
            yield return new ValidationResult(
                "O volume financeiro da transação excede o limite de segurança de R$ 100.000.000,00.",
                [nameof(Quantity), nameof(UnitPrice)]
            );
        }
    }
}