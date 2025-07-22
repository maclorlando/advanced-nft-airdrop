// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/Multicall.sol";
import "@openzeppelin/contracts/utils/structs/BitMaps.sol";

contract AdvancedNFT is ERC721Enumerable, Ownable, Multicall {
    using BitMaps for BitMaps.BitMap;

    enum ClaimMode {
        Mapping,
        Bitmap
    }

    enum MintState {
        Closed,
        Presale,
        Public,
        SoldOut
    }

    bytes32 public merkleRoot;
    ClaimMode public claimMode;
    MintState public mintState;

    uint256 public immutable maxSupply = 10000;
    uint256 public publicMintFee = 0.01 ether;

    BitMaps.BitMap private claimedBitmap;
    mapping(address => bool) private claimedMapping;

    mapping(address => bytes32) private committedSecrets;
    mapping(address => uint256) private committedIndexes;

    mapping(uint256 => uint256) private tokenMatrix;

    mapping(address => uint256) public pendingWithdrawals;

    uint256 private remainingSupply = maxSupply;

    constructor(
        string memory name,
        string memory symbol,
        bytes32 _root,
        ClaimMode _mode
    ) ERC721(name, symbol) {
        merkleRoot = _root;
        claimMode = _mode;
        mintState = MintState.Closed;
    }

    modifier onlyState(MintState required) {
        require(mintState == required, "Invalid mint state");
        _;
    }

    function setMintState(MintState state) external onlyOwner {
        mintState = state;
    }

   // ----------------------------------------
// 📦 Presale Mint: Commit + Reveal
// ----------------------------------------
function commit(
        uint256 index,
        bytes32[] calldata proof,
        string calldata secret
    ) external onlyState(MintState.Presale) {
        require(committedSecrets[msg.sender] == 0, "Already committed");

        bytes32 leaf = keccak256(abi.encodePacked(index, msg.sender));
        require(MerkleProof.verify(proof, merkleRoot, leaf), "Not whitelisted");

        committedSecrets[msg.sender] = keccak256(abi.encodePacked(msg.sender, secret));
        committedIndexes[msg.sender] = index;
    }

function reveal(string calldata secret) external onlyState(MintState.Presale) {
    require(remainingSupply > 0, "Sold out");
    require(committedSecrets[msg.sender] != 0, "No commit found");

    require(
        keccak256(abi.encodePacked(msg.sender, secret)) == committedSecrets[msg.sender],
        "Invalid secret"
    );

    uint256 index = committedIndexes[msg.sender];

    if (claimMode == ClaimMode.Mapping) {
        require(!claimedMapping[msg.sender], "Already claimed");
        claimedMapping[msg.sender] = true;
    } else {
        require(!claimedBitmap.get(index), "Already claimed");
        claimedBitmap.set(index);
    }

    // clear commitments
    committedSecrets[msg.sender] = 0;
    committedIndexes[msg.sender] = 0;

    uint256 tokenId = _assignRandomTokenId();
    _mint(msg.sender, tokenId);

    if (remainingSupply == 0) {
        mintState = MintState.SoldOut;
    }
}

    // ----------------------------------------
    // 💰 Public Mint
    // ----------------------------------------

    function publicMint() external payable onlyState(MintState.Public) {
        require(remainingSupply > 0, "Sold out");
        require(msg.value >= publicMintFee, "Insufficient ETH");

        uint256 tokenId = _assignRandomTokenId();
        _mint(msg.sender, tokenId);

        if (remainingSupply == 0) {
            mintState = MintState.SoldOut;
        }
    }

    // ----------------------------------------
    // 🎲 Random Assignment Logic
    // ----------------------------------------

    function _assignRandomTokenId() internal returns (uint256) {
        uint256 maxIndex = remainingSupply;
        uint256 random = uint256(
            keccak256(
                abi.encodePacked(
                    msg.sender,
                    block.coinbase,
                    block.prevrandao,
                    block.timestamp,
                    remainingSupply
                )
            )
        ) % maxIndex;

        uint256 value = tokenMatrix[random] == 0 ? random : tokenMatrix[random];
        uint256 last = tokenMatrix[maxIndex - 1] == 0
            ? maxIndex - 1
            : tokenMatrix[maxIndex - 1];

        tokenMatrix[random] = last;

        remainingSupply--;

        return value + 1;
    }

// ----------------------------------------
// 📦 Multicall Override (NFT transfers only)
// ----------------------------------------

function multicall(bytes[] calldata data)
    external
    override
    returns (bytes[] memory results)
{
    results = new bytes[](data.length);

    for (uint256 i = 0; i < data.length; i++) {
        bytes4 selector = bytes4(data[i]);
        require(
            selector == this.transferFrom.selector ||
            selector == bytes4(keccak256("safeTransferFrom(address,address,uint256)")) ||
            selector == bytes4(keccak256("safeTransferFrom(address,address,uint256,bytes)")),
            "Only transfer calls allowed"
        );

        // Decode `from` from calldata and reject if it's address(0)
        (address from,,) = abi.decode(data[i][4:], (address, address, uint256));
        require(from != address(0), "from cannot be zero");

        (bool success, bytes memory result) = address(this).delegatecall(data[i]);
        require(success, "Multicall: call failed");
        results[i] = result;
    }
}




    // ----------------------------------------
    // 💸 Pull-Pattern Withdrawals
    // ----------------------------------------

    function recordContribution(address contributor) external payable onlyOwner {
        pendingWithdrawals[contributor] += msg.value;
    }

    function withdraw() external {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "Nothing to withdraw");
        pendingWithdrawals[msg.sender] = 0;
        (bool sent, ) = payable(msg.sender).call{value: amount}("");
        require(sent, "Failed to send");
    }

    // ----------------------------------------
    // 📋 Getters
    // ----------------------------------------

    function hasClaimedMapping(address user) external view returns (bool) {
        return claimedMapping[user];
    }

    function hasClaimedBitmap(uint256 index) external view returns (bool) {
        return claimedBitmap.get(index);
    }
    
    function getCommittedSecret(address user) external view returns (bytes32) {
        return committedSecrets[user];
    }


    receive() external payable {}
}
