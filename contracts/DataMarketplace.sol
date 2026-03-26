// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title DataMarketplace
 * @notice UUPS-upgradeable marketplace for buying and selling indexed datasets.
 *         Payment is made in INC (CreditToken).
 */
contract DataMarketplace is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    using SafeERC20 for IERC20;
    // ── Reentrancy guard ──────────────────────────────────────────────────────
    uint256 private _reentrancyStatus;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED     = 2;

    modifier nonReentrant() {
        require(_reentrancyStatus != _ENTERED, "ReentrancyGuard: reentrant call");
        _reentrancyStatus = _ENTERED;
        _;
        _reentrancyStatus = _NOT_ENTERED;
    }
    // NOTE: Only INC is supported as the payment token for now.
    IERC20 public paymentToken;
    uint256 public platformFeePercent;

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

    uint256 public listingCount;
    uint256 public purchaseCount;

    mapping(uint256 => Listing)  public listings;
    mapping(uint256 => Purchase) public purchases;
    mapping(address => uint256)  public sellerReputation;

    // ── Events ────────────────────────────────────────────────────────────────
    event ListingCreated(uint256 indexed listingId, address indexed seller, uint256 price);
    event ListingDeactivated(uint256 indexed listingId);
    event DatasetPurchased(uint256 indexed listingId, uint256 indexed purchaseId, address indexed buyer);
    event ReputationUpdated(address indexed seller, uint256 newScore);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _paymentToken, address _owner) external initializer {
        require(_paymentToken != address(0), "zero address: paymentToken");
        require(_owner        != address(0), "zero address: owner");
        __Ownable_init(_owner);
        _reentrancyStatus  = _NOT_ENTERED;
        paymentToken       = IERC20(_paymentToken);
        platformFeePercent = 5;
    }

    // ── Marketplace logic ─────────────────────────────────────────────────────

    function createListing(
        string calldata datasetCID,
        string calldata metadataURI,
        uint256 price
    ) external {
        require(price > 0, "Price must be greater than zero");
        listingCount++;
        listings[listingCount] = Listing({
            seller:      msg.sender,
            datasetCID:  datasetCID,
            metadataURI: metadataURI,
            price:       price,
            active:      true,
            sales:       0,
            createdAt:   block.timestamp
        });
        emit ListingCreated(listingCount, msg.sender, price);
    }

    function deactivateListing(uint256 listingId) external {
        Listing storage l = listings[listingId];
        require(l.seller == msg.sender, "Not listing owner");
        require(l.active, "Already inactive");
        l.active = false;
        emit ListingDeactivated(listingId);
    }

    function purchaseDataset(uint256 listingId) external nonReentrant {
        Listing storage l = listings[listingId];
        require(l.active, "Listing not active");
        require(l.seller != msg.sender, "Cannot buy own listing");

        uint256 fee         = (platformFeePercent * l.price) / 100;
        uint256 sellerShare = l.price - fee;

        paymentToken.safeTransferFrom(msg.sender, l.seller, sellerShare);
        paymentToken.safeTransferFrom(msg.sender, address(this), fee);

        purchaseCount++;
        purchases[purchaseCount] = Purchase({
            listingId:   listingId,
            buyer:       msg.sender,
            paidAmount:  l.price,
            purchasedAt: block.timestamp,
            refunded:    false
        });

        l.sales++;
        sellerReputation[l.seller]++;

        emit DatasetPurchased(listingId, purchaseCount, msg.sender);
        emit ReputationUpdated(l.seller, sellerReputation[l.seller]);
    }

    function getListingDetails(uint256 listingId) external view returns (Listing memory) {
        return listings[listingId];
    }

    function setPlatformFee(uint256 newFeePercent) external onlyOwner {
        require(newFeePercent <= 20, "Fee too high");
        platformFeePercent = newFeePercent;
    }

    function withdrawFees(address to) external onlyOwner {
        uint256 bal = paymentToken.balanceOf(address(this));
        require(bal > 0, "Nothing to withdraw");
        paymentToken.safeTransfer(to, bal);
    }

    // ── UUPS ──────────────────────────────────────────────────────────────────
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // ── Storage gap ───────────────────────────────────────────────────────────
    uint256[50] private __gap;
}
