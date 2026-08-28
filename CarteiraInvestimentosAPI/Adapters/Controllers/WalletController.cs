using CarteiraInvestimentosAPI.Domain.Services.Ports;
using CarteiraInvestimentosAPI.Dtos;
using Microsoft.AspNetCore.Mvc;

namespace CarteiraInvestimentosAPI.Adapters.Controllers;

[Route("api/wallet")]
[ApiController]
public class WalletController(IWalletService walletService) : ControllerBase
{
    private readonly IWalletService _walletService = walletService;
    // Registrar transações
    [HttpPost("{customerId:guid}/transactions")]
    public async Task<IActionResult> RecordTransaction(Guid customerId, TransactionInputDto transactionInput)
    {
        var transaction = await _walletService.RecordTransactionAsync(customerId, transactionInput);
        return Ok(transaction);
    }

    // Listar transações
    [HttpGet("{customerId:guid}/transactions")]  
    public async Task<IActionResult> ListCustomerTransactions(Guid customerId, [FromQuery] int? page, [FromQuery] int? limit)
    {
        int currentPage = page ?? 1;
        int currentLimit = limit ?? 25;
        
        return Ok(await _walletService.ListCustomerTransactionAsync(customerId, currentPage, currentLimit));
    }

    // Consultar a wallet 
    [HttpGet("{customerId:guid}/summary")]
    public async Task<IActionResult> GetWalletSummary(Guid customerId)
    {
        return Ok(await _walletService.GetWalletSummary(customerId));
    }
}