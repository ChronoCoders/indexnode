use anyhow::{Context, Result}; 
use ethers::prelude::*; 
use std::sync::Arc;

abigen!(DataMarketplace, "./contracts/DataMarketplace.json"); 
 
pub struct MarketplaceClient { 
    contract: DataMarketplace<SignerMiddleware<Provider<Ws>, LocalWallet>>, 
} 
 
impl MarketplaceClient { 
    pub async fn new(rpc_url: &str, contract_addr: Address, private_key: &str) -> Result<Self> { 
        let provider = Provider::<Ws>::connect(rpc_url).await 
            .context("Failed to connect to RPC")?; 
        let chain_id = provider.get_chainid().await?.as_u64(); 
        let wallet = private_key.parse::<LocalWallet>()?.with_chain_id(chain_id); 
        let client = SignerMiddleware::new(provider, wallet); 
        let contract = DataMarketplace::new(contract_addr, Arc::new(client)); 
        Ok(Self { contract }) 
    } 
 
    pub async fn create_listing(&self, cid: &str, metadata_uri: &str, price: U256) -> Result<H256> { 
        let call = self.contract 
            .create_listing(cid.to_string(), metadata_uri.to_string(), price);
        let tx = call.send() 
            .await 
            .context("Failed to create listing")?; 
        let receipt = tx.await?.context("Transaction not mined")?; 
        Ok(receipt.transaction_hash) 
    } 
 
    pub async fn purchase_dataset(&self, listing_id: U256) -> Result<H256> { 
        let call = self.contract 
            .purchase_dataset(listing_id);
        let tx = call.send() 
            .await 
            .context("Failed to purchase dataset")?; 
        let receipt = tx.await?.context("Transaction not mined")?; 
        Ok(receipt.transaction_hash) 
    } 
 
    pub async fn get_listing(&self, listing_id: U256) -> Result<Listing> { 
        self.contract.get_listing_details(listing_id).call().await 
            .context("Failed to get listing details") 
    } 
 
    pub async fn get_seller_reputation(&self, seller: Address) -> Result<U256> { 
        self.contract.seller_reputation(seller).call().await 
            .context("Failed to get reputation") 
    } 
} 
