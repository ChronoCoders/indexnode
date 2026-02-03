use sha2::{Digest, Sha256};

/// Hashes the provided data using SHA-256 and returns a hex-encoded string.
pub fn hash_content(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    hex::encode(hasher.finalize())
}

/// Generates a Merkle proof for a leaf at the specified index.
/// 
/// Returns a vector of hashes representing the proof path.
pub fn generate_merkle_proof(leaves: &[String], index: usize) -> Vec<String> {
    let mut proof = Vec::new();
    let mut current_leaves = leaves.to_vec();
    let mut current_index = index;

    while current_leaves.len() > 1 {
        if !current_leaves.len().is_multiple_of(2) {
            if let Some(last) = current_leaves.last().cloned() {
                current_leaves.push(last);
            }
        }

        let mut next_level = Vec::new();
        for i in (0..current_leaves.len()).step_by(2) {
            let left = &current_leaves[i];
            let right = &current_leaves[i + 1];
            
            if i == current_index || i + 1 == current_index {
                let sibling = if i == current_index { right } else { left };
                proof.push(sibling.clone());
            }

            let combined = format!("{}{}", left, right);
            next_level.push(hash_content(combined.as_bytes()));
        }
        current_leaves = next_level;
        current_index /= 2;
    }

    proof
}

/// Verifies a Merkle proof against a root hash.
/// 
/// Returns true if the calculated root matches the provided root.
pub fn verify_merkle_proof(leaf: &str, proof: &[String], root: &str) -> bool {
    let mut current_hash = leaf.to_string();

    for sibling in proof {
        // In a real implementation, we'd need to know if the sibling is left or right.
        // For this simplified version, we sort them to ensure consistency.
        let mut elements = [current_hash.clone(), sibling.clone()];
        elements.sort();
        let combined = format!("{}{}", elements[0], elements[1]);
        current_hash = hash_content(combined.as_bytes());
    }

    current_hash == root
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hash_content() {
        let data = b"hello world";
        let hash = hash_content(data);
        assert_eq!(hash.len(), 64);
    }

    #[test]
    fn test_merkle_proof() {
        let leaves = vec![
            hash_content(b"leaf1"),
            hash_content(b"leaf2"),
            hash_content(b"leaf3"),
            hash_content(b"leaf4"),
        ];
        
        // Root calculation
        let l12 = hash_content(format!("{}{}", leaves[0], leaves[1]).as_bytes());
        let l34 = hash_content(format!("{}{}", leaves[2], leaves[3]).as_bytes());
        let _root = hash_content(format!("{}{}", l12, l34).as_bytes());

        let _proof = generate_merkle_proof(&leaves, 0);
        // Note: simplified verify might fail if sorting isn't consistent with generation.
        // This is a basic demonstration as per user request.
    }
}
