use sha2::{Digest, Sha256};

pub fn hash_content(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    hex::encode(hasher.finalize())
}

pub fn compute_merkle_root(leaves: &[String]) -> String {
    if leaves.is_empty() {
        return hash_content(b"");
    }
    let mut current = leaves.to_vec();
    while current.len() > 1 {
        if !current.len().is_multiple_of(2) {
            let last = current.last().cloned().unwrap();
            current.push(last);
        }
        current = current
            .chunks(2)
            .map(|pair| hash_content(format!("{}{}", pair[0], pair[1]).as_bytes()))
            .collect();
    }
    current.remove(0)
}

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

pub fn verify_merkle_proof(
    leaf: &str,
    proof: &[String],
    root: &str,
    leaf_index: usize,
    total_leaves: usize,
) -> bool {
    let mut current_hash = leaf.to_string();
    let mut current_index = leaf_index;
    let mut level_size = total_leaves;

    for sibling in proof {
        if !level_size.is_multiple_of(2) {
            level_size += 1;
        }
        let combined = if current_index.is_multiple_of(2) {
            format!("{}{}", current_hash, sibling)
        } else {
            format!("{}{}", sibling, current_hash)
        };
        current_hash = hash_content(combined.as_bytes());
        current_index /= 2;
        level_size /= 2;
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

        let l12 = hash_content(format!("{}{}", leaves[0], leaves[1]).as_bytes());
        let l34 = hash_content(format!("{}{}", leaves[2], leaves[3]).as_bytes());
        let root = hash_content(format!("{}{}", l12, l34).as_bytes());

        let proof = generate_merkle_proof(&leaves, 0);
        assert!(verify_merkle_proof(
            &leaves[0],
            &proof,
            &root,
            0,
            leaves.len()
        ));

        let proof2 = generate_merkle_proof(&leaves, 2);
        assert!(verify_merkle_proof(
            &leaves[2],
            &proof2,
            &root,
            2,
            leaves.len()
        ));
    }
}
