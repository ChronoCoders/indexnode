// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.0; 
 
import "@openzeppelin/contracts/token/ERC20/IERC20.sol"; 
import "@openzeppelin/contracts/security/ReentrancyGuard.sol"; 
 
contract DataMarketplace is ReentrancyGuard { 
    IERC20 public paymentToken; 
    
    struct Listing { 
        address seller; 
        string datasetCID; 
        string metadataURI; 
        uint256 price; 
        bool active; 
        uint256 sales; 
        uint256 createdAt; 
    } 
    
    struct Purchase { 
        uint256 listingId; 
        address buyer; 
        uint256 paidAmount; 
        uint256 purchasedAt; 
        bool refunded; 
    } 
    
    mapping(uint256 => Listing) public listings; 
    mapping(uint256 => Purchase) public purchases; 
    mapping(address => uint256) public sellerReputation; 
    
    uint256 public listingCount; 
    uint256 public purchaseCount; 
    uint256 public platformFeePercent = 5; 
    
    event ListingCreated(uint256 indexed listingId, address indexed seller, uint256 price); 
    event DatasetPurchased(uint256 indexed listingId, uint256 indexed purchaseId, address indexed buyer); 
    event ListingDeactivated(uint256 indexed listingId); 
    event ReputationUpdated(address indexed seller, uint256 newScore); 
    
    constructor(address _paymentToken) { 
        paymentToken = IERC20(_paymentToken); 
    } 
    
    function createListing(string memory datasetCID, string memory metadataURI, uint256 price) external { 
        require(price > 0, "Price must be greater than zero"); 
        
        listingCount++; 
        listings[listingCount] = Listing({ 
            seller: msg.sender, 
            datasetCID: datasetCID, 
            metadataURI: metadataURI, 
            price: price, 
            active: true, 
            sales: 0, 
            createdAt: block.timestamp 
        }); 
        
        emit ListingCreated(listingCount, msg.sender, price); 
    } 
    
    function purchaseDataset(uint256 listingId) external nonReentrant { 
        Listing storage listing = listings[listingId]; 
        require(listing.active, "Listing not active"); 
        require(msg.sender != listing.seller, "Cannot buy own listing"); 
        
        uint256 platformFee = (listing.price * platformFeePercent) / 100; 
        uint256 sellerAmount = listing.price - platformFee; 
        
        require( 
            paymentToken.transferFrom(msg.sender, listing.seller, sellerAmount), 
            "Payment to seller failed" 
        ); 
        require( 
            paymentToken.transferFrom(msg.sender, address(this), platformFee), 
            "Platform fee transfer failed" 
        ); 
        
        purchaseCount++; 
        purchases[purchaseCount] = Purchase({ 
            listingId: listingId, 
            buyer: msg.sender, 
            paidAmount: listing.price, 
            purchasedAt: block.timestamp, 
            refunded: false 
        }); 
        
        listing.sales++; 
        sellerReputation[listing.seller]++; 
        
        emit DatasetPurchased(listingId, purchaseCount, msg.sender); 
        emit ReputationUpdated(listing.seller, sellerReputation[listing.seller]); 
    } 
    
    function deactivateListing(uint256 listingId) external { 
        Listing storage listing = listings[listingId]; 
        require(msg.sender == listing.seller, "Not listing owner"); 
        require(listing.active, "Already inactive"); 
        
        listing.active = false; 
        emit ListingDeactivated(listingId); 
    } 
    
    function getListingDetails(uint256 listingId) external view returns (Listing memory) { 
        return listings[listingId]; 
    } 
} 
