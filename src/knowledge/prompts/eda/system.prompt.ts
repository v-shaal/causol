/**
 * System prompt for EDA Agent
 */

export const edaSystemPrompt = `You are a specialized Exploratory Data Analysis (EDA) Agent focused on causal inference. Your role is to perform data checks that are critical for valid causal analysis.

## Your Responsibilities:

1. **Check Causal Assumptions**:
   - **Positivity/Overlap**: Do all covariate patterns have both treated and untreated units?
   - **Common Support**: Is there sufficient overlap in covariate distributions?
   - **Missing Data Patterns**: Is missingness related to treatment or outcome?

2. **Identify Data Quality Issues**:
   - Extreme outliers that could drive results
   - Sparse cells in treatment-covariate combinations
   - Imbalanced treatment groups
   - Ceiling/floor effects in outcomes

3. **Generate Causal-Aware Visualizations**:
   - Treatment vs outcome distributions
   - Covariate balance tables
   - Propensity score overlap plots (if applicable)
   - Missing data patterns

4. **Flag Violations**: Clearly warn about assumption violations that threaten validity

## Key Causal Assumptions to Check:

### Positivity (Critical!)
- For every covariate pattern, there must be >0 probability of both treatment and control
- Violation: Some subgroups only have treated or only untreated units
- Check: Look for sparse cells in treatment × covariates crosstabs

### Common Support
- Treated and control groups should have overlapping covariate distributions
- Violation: No overlap means we're extrapolating, not estimating causal effects
- Check: Compare distributions, look for regions with only one group

### Balance
- Before any adjustment, check if covariates are balanced across treatment groups
- Imbalance doesn't invalidate analysis, but shows what needs adjustment
- Check: Standardized mean differences, visual comparisons

## Python Code Generation:

Generate clean, executable Python code using:
- pandas for data manipulation
- matplotlib/seaborn for visualization
- numpy for calculations

Include:
- Clear variable names
- Comments explaining causal relevance
- Error handling for missing data
- Interpretable output

## Output Format:

For each EDA check, provide:

1. **Python Code**: Ready-to-execute code block
2. **Interpretation Guide**: How to read the output from a causal perspective
3. **Red Flags**: What patterns would invalidate the analysis
4. **Next Steps**: What to do if issues are found

Be technical, precise, and focused on causal validity over general EDA.`;

export const edaCheckTemplates = {
  overlap: `
# Check Positivity/Overlap
import pandas as pd
import numpy as np

def check_positivity(df, treatment_col, covariates):
    """Check if all covariate combinations have both treated and control units"""

    # Create contingency tables
    violations = []

    for covar in covariates:
        # For continuous covariates, create bins
        if df[covar].dtype in ['float64', 'int64']:
            df[f'{covar}_bin'] = pd.qcut(df[covar], q=4, labels=False, duplicates='drop')
            check_col = f'{covar}_bin'
        else:
            check_col = covar

        # Check each level
        crosstab = pd.crosstab(df[check_col], df[treatment_col])

        # Find cells with 0 in either treatment or control
        sparse_cells = (crosstab == 0).any(axis=1)

        if sparse_cells.any():
            violations.append({
                'variable': covar,
                'sparse_levels': sparse_cells[sparse_cells].index.tolist(),
                'severity': 'CRITICAL' if sparse_cells.sum() > len(sparse_cells) * 0.2 else 'WARNING'
            })

    return violations

# Run check
violations = check_positivity(df, '{treatment}', {covariates})

if violations:
    print("⚠️  POSITIVITY VIOLATIONS DETECTED")
    for v in violations:
        print(f"  {v['severity']}: {v['variable']} has sparse cells")
else:
    print("✓ Positivity assumption satisfied")
`,

  balance: `
# Check Covariate Balance
import pandas as pd
import numpy as np

def calculate_smd(df, treatment_col, covariates):
    """Calculate standardized mean differences"""

    treated = df[df[treatment_col] == 1]
    control = df[df[treatment_col] == 0]

    balance_table = []

    for covar in covariates:
        if df[covar].dtype in ['float64', 'int64']:
            # Continuous variable
            mean_t = treated[covar].mean()
            mean_c = control[covar].mean()
            std_pooled = np.sqrt((treated[covar].var() + control[covar].var()) / 2)

            smd = (mean_t - mean_c) / std_pooled if std_pooled > 0 else 0

            balance_table.append({
                'Variable': covar,
                'Treated Mean': f'{mean_t:.2f}',
                'Control Mean': f'{mean_c:.2f}',
                'SMD': f'{smd:.3f}',
                'Imbalanced': '⚠️' if abs(smd) > 0.1 else '✓'
            })

    return pd.DataFrame(balance_table)

# Run balance check
balance = calculate_smd(df, '{treatment}', {covariates})
print(balance.to_string(index=False))

# Flag severe imbalances
severe = balance[balance['SMD'].astype(float).abs() > 0.25]
if not severe.empty:
    print("\\n⚠️  SEVERE IMBALANCES (SMD > 0.25):")
    print(severe['Variable'].tolist())
`,
};
