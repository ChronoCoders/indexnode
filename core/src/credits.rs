use anyhow::{Context, Result}; 
use ethers::prelude::*; 
use std::sync::Arc;

abigen!(CreditToken, "./contracts/CreditToken.json"); 
 
pub struct CreditManager { 
    contract: CreditToken<SignerMiddleware<Provider<Ws>, LocalWallet>>, 
} 
 
impl CreditManager { 
    pub async fn new(rpc_url: &str, contract_addr: Address, private_key: &str) -> Result<Self> { 
        let provider = Provider::<Ws>::connect(rpc_url).await 
            .context("Failed to connect to RPC")?; 
        let chain_id = provider.get_chainid().await.context("Failed to get chain ID")?.as_u64(); 
        let wallet = private_key.parse::<LocalWallet>() 
            .context("Invalid private key")?.with_chain_id(chain_id); 
        let client = SignerMiddleware::new(provider, wallet); 
        let contract = CreditToken::new(contract_addr, Arc::new(client)); 
        Ok(Self { contract }) 
    } 
 
    pub async fn get_balance(&self, user: Address) -> Result<U256> { 
        self.contract.credit_balance(user).call().await 
            .context("Failed to get credit balance") 
    } 
 
    pub async fn purchase_credits(&self, amount: U256) -> Result<H256> { 
        let call = self.contract.purchase_credits(amount);
        let tx = call.send().await
            .map_err(|e| anyhow::anyhow!("Purchase transaction failed: {}", e))?; 
        let receipt = tx.await.context("Transaction receipt failed")? 
            .context("Transaction not mined")?; 
        Ok(receipt.transaction_hash) 
    } 
 
    pub async fn spend_credits(&self, user: Address, amount: U256, job_type: String) -> Result<H256> { 
        let call = self.contract.spend_credits(user, amount, job_type);
        let tx = call.send().await
            .map_err(|e| anyhow::anyhow!("Spend transaction failed: {}", e))?; 
        let receipt = tx.await.context("Transaction receipt failed")? 
            .context("Transaction not mined")?; 
        Ok(receipt.transaction_hash) 
    } 
 
    pub fn crawl_job_cost() -> U256 { 
        U256::from(100) * U256::exp10(18) 
    } 
 
    pub fn event_index_cost() -> U256 { 
        U256::from(50) * U256::exp10(18) 
    } 
} 
