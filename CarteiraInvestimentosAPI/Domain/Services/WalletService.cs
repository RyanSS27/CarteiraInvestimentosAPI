using CarteiraInvestimentosAPI.Adapters.Infrastructure.ExternalServices;
using CarteiraInvestimentosAPI.Adapters.Infrastructure.Repositories;
using CarteiraInvestimentosAPI.Database;
using CarteiraInvestimentosAPI.Domain.Entities;
using CarteiraInvestimentosAPI.Domain.Entities.Enums;
using CarteiraInvestimentosAPI.Domain.Exceptions;
using CarteiraInvestimentosAPI.Domain.Services.Ports;
using CarteiraInvestimentosAPI.Dtos;
using Asset = CarteiraInvestimentosAPI.Domain.Entities.Asset;
using Entities_Asset = CarteiraInvestimentosAPI.Domain.Entities.Asset;

namespace CarteiraInvestimentosAPI.Domain.Services;

public class WalletService(
    ICustomerRepository customerRepository,
    ITransactionRepository transactionRepository, 
    IFinancialMarketService financialMarketService)
    : IWalletService
{
    private const int LimitPerRequest = 25;

    public async Task<WalletOutDto> GetWalletSummary(Guid customerId)
    {
        var customer = await customerRepository.GetCustomerAsync(customerId);
        if (customer is null)
            throw new NotFoundException($"Cliente de id '{customerId}' não encontrado");

        if (customer.Assets.Count <= 0)
            throw new DomainException($"Cliente {customer.Name} de id {customerId} não possui investimentos em ativos no momento."); // odiei essa frase kkkkkkkkk

        var marketPrices = await financialMarketService.GetPriceAsync(
            customer.Assets.Select(x => x.Ticker).Distinct().ToList() // lista de tickers
            );
        
        decimal totalValue = 0;
        decimal totalValueUpToDate = 0;
        decimal totalValueEstimated = 0;

        List<AssetOutDto> assetsOut = [];

        
        foreach (var asset in customer.Assets)
        {
            // Tenta buscar o Ticker no dicionário e retorna o booleano para apontar se achou.
            // Declara implicitamente se a variável currentMarketPrice que receberia o valor correspondente
            bool isPriceUpToDate = marketPrices.TryGetValue(asset.Ticker, out decimal currentMarketPrice);
            if (!isPriceUpToDate)
                currentMarketPrice = asset.AveragePrice;
            
            
            decimal totalCurrentValue = asset.Quantity * currentMarketPrice;
            decimal profitOrLoss = totalCurrentValue - asset.CurrentAmountInvested;
        
            decimal returnPercentage = asset.AveragePrice > 0 
                ? ((currentMarketPrice / asset.AveragePrice) - 1) * 100 
                : 0;

            
            assetsOut.Add(new AssetOutDto(
                asset.Ticker,
                asset.Quantity,
                asset.AveragePrice,
                asset.CurrentAmountInvested,
                currentMarketPrice,
                totalCurrentValue,
                Math.Round(returnPercentage, 2),
                Math.Round(profitOrLoss, 2),
                isPriceUpToDate
            ));
            
            totalValue += totalCurrentValue;

            if (isPriceUpToDate)
                totalValueUpToDate += totalCurrentValue;
            else
                totalValueEstimated += totalCurrentValue;
        }
        
        return new WalletOutDto(
            totalValue,
            totalValueUpToDate,
            totalValueEstimated,
            DateTime.UtcNow,
            assetsOut
        );
    }

    public async Task<List<TransactionOutDto>> ListCustomerTransactionAsync(Guid customerId, int page, int limit)
    {
        var customer = await customerRepository.GetCustomerAsync(customerId);
        if (customer is null)
            throw new NotFoundException($"Cliente de id '{customerId}' não encontrado");
        
        if (limit > LimitPerRequest || limit <= 0)
            limit = LimitPerRequest;
            
        if (page <= 0)
            page = 1;
            
        int skip = (page - 1) * limit;
        
        var transaction = await transactionRepository.ListTransactionsAsync(customerId, skip, limit);
        return transaction
            .Select(MapToTransactionOutDto) // versão implicita que passa cada transação para a função
            .ToList();
    }

    public async Task<TransactionOutDto> RecordTransactionAsync(Guid customerId, TransactionInputDto transactionInput)
    {
        // diversão começa aqui
        var customer = await customerRepository.GetCustomerAsync(customerId);
        if (customer is null)
            throw new NotFoundException($"Cliente de id '{customerId}' não encontrado");
        
        switch (transactionInput.TransactionType)
        {
            case TransactionType.BUY:
            {
                customer.AddAsset(new Entities_Asset(
                    transactionInput.Ticker,
                    transactionInput.Quantity,
                    transactionInput.UnitPrice
                ));
            
                var transaction = new Transaction(
                    customerId,
                    transactionInput.TransactionType,
                    transactionInput.Quantity,
                    transactionInput.UnitPrice,
                    transactionInput.Ticker);
                
                await customerRepository.UpdateCustomerAsync(customer);
                await transactionRepository.AddTransactionAsync(transaction);
            
                return MapToTransactionOutDto(transaction);
            }
            case TransactionType.SELL:
            {
                customer.SellAsset(transactionInput.Ticker, transactionInput.Quantity);

                var transaction = new Transaction(
                    customerId,
                    transactionInput.TransactionType,
                    transactionInput.Quantity,
                    transactionInput.UnitPrice,
                    transactionInput.Ticker
                    );

                await customerRepository.UpdateCustomerAsync(customer);
                await transactionRepository.AddTransactionAsync(transaction);
                
                return MapToTransactionOutDto(transaction);
            }
            
            default:
                throw new ArgumentOutOfRangeException();
        }
    }

    // Converte transaction → transactionOutDto 
    private static TransactionOutDto MapToTransactionOutDto(Transaction transaction)
    {
        return new TransactionOutDto(
            transaction.Id,
            transaction.CustomerId,
            transaction.TransactionDate,
            transaction.TransactionType, 
            transaction.Quantity,
            transaction.UnitPrice,
            transaction.Ticker
        );
    }

    private static AssetOutDto MapToOutDto(
        Entities_Asset asset,
        decimal currentMarketPrice, 
        decimal totalCurrentValue,
        decimal returnPercentage,
        decimal profitOrLoss,
        bool isPriceUpToDate
    )
    {
        return new AssetOutDto(
            asset.Ticker,
            asset.Quantity,
            asset.AveragePrice,
            asset.CurrentAmountInvested,
            currentMarketPrice,
            totalCurrentValue,
            returnPercentage, 
            profitOrLoss, 
            isPriceUpToDate
            );
    }
}

