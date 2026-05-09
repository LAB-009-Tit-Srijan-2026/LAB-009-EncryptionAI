from typing import List, Dict

def simplify_debts(balances: List[Dict]) -> List[Dict]:
    """
    Greedy algorithm to minimize transactions between members.
    balances: List of {"user_id": int, "name": str, "balance": float}
    Returns: List of {"from": str, "to": str, "amount": float}
    """
    # Filter out people with zero balance
    debtors = [] # People who owe money (negative balance)
    creditors = [] # People who are owed money (positive balance)

    for b in balances:
        if b["balance"] < -0.01:
            debtors.append({"name": b["name"], "amount": abs(b["balance"])})
        elif b["balance"] > 0.01:
            creditors.append({"name": b["name"], "amount": b["balance"]})

    # Sort to greedily match largest debtor with largest creditor
    debtors.sort(key=lambda x: x["amount"], reverse=True)
    creditors.sort(key=lambda x: x["amount"], reverse=True)

    settlements = []
    i, j = 0, 0

    while i < len(debtors) and j < len(creditors):
        amount = min(debtors[i]["amount"], creditors[j]["amount"])
        
        settlements.append({
            "from": debtors[i]["name"],
            "to": creditors[j]["name"],
            "amount": round(amount, 2)
        })

        debtors[i]["amount"] -= amount
        creditors[j]["amount"] -= amount

        if debtors[i]["amount"] < 0.01: i += 1
        if creditors[j]["amount"] < 0.01: j += 1

    return settlements
