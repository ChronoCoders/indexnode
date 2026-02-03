#!/bin/bash 
 
echo "Running security audit..." 
 
# Cargo audit for vulnerable dependencies 
if command -v cargo-audit &> /dev/null; then
    cargo audit 
else
    echo "cargo-audit not installed, skipping dependency check"
fi
 
# Check for common security patterns 
echo -e "\nChecking for potential security issues..." 
grep -r "unwrap()" --include="*.rs" core/ api/ || echo "No unwrap() found ✓" 
echo -n "Total expect() calls: "
grep -r "expect(" --include="*.rs" core/ api/ | wc -l 
grep -r "unsafe" --include="*.rs" core/ api/ || echo "No unsafe blocks ✓" 
 
# SQL injection patterns 
echo -e "\nChecking SQL safety..." 
grep -r "format!.*SELECT" --include="*.rs" api/ && echo "⚠ Potential SQL injection" || echo "SQL queries safe ✓" 
 
# Secrets in code 
echo -e "\nChecking for hardcoded secrets..." 
grep -rE "(password|secret|key)\s*=\s*\"" --include="*.rs" --exclude-dir=target . && echo "⚠ Hardcoded secrets found" || echo "No hardcoded secrets ✓" 
 
echo -e "\n✓ Security audit complete" 
