using CarteiraInvestimentosAPI.Dtos;

namespace CarteiraInvestimentosAPI.Domain.Services.Ports;

public interface IWalletService
{
    Task<List<TransactionOutDto>> ListCustomerTransactionAsync(Guid customerId, int page, int limit);
    Task<TransactionOutDto> RecordTransactionAsync(Guid customerId, TransactionInputDto transactionInput);

    // listar assets 
    Task<WalletOutDto> GetWalletSummary(Guid customerId);
}