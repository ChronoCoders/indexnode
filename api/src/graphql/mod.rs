pub mod schema; 
pub mod types; 
 
pub use schema::AppSchema;
use indexnode_core::{CreditManager, MarketplaceClient};
use sqlx::PgPool;

pub fn build_schema(pool: PgPool, credit_manager: CreditManager, marketplace: MarketplaceClient) -> AppSchema {
    schema::build_schema(pool, credit_manager, marketplace)
}
