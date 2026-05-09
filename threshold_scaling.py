import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

matplotlib.rcParams['font.family'] = ['MS Gothic', 'Yu Gothic', 'Meiryo', 'sans-serif']

def relative_threshold(scores, ratio=0.15):
    return float(scores.min() + (scores.max() - scores.min()) * ratio)

def percentile_threshold(scores, p=60):
    return float(np.percentile(scores, p))

HIGH_OUTLIER = 0.92
LOW_OUTLIER  = 0.30
N_NOW        = 13  # 現在のノート件数

delta_rel_high, delta_pct_high = [], []
delta_rel_low,  delta_pct_low  = [], []
N_VALS = list(range(5, 201))

for N in N_VALS:
    # 0.48〜0.72 に等間隔で N 件分布
    base = np.linspace(0.48, 0.72, N)
    t_n_rel = relative_threshold(base)
    t_n_pct = percentile_threshold(base)

    hi = np.append(base, HIGH_OUTLIER)
    delta_rel_high.append(abs(relative_threshold(hi) - t_n_rel))
    delta_pct_high.append(abs(percentile_threshold(hi) - t_n_pct))

    lo = np.append(base, LOW_OUTLIER)
    delta_rel_low.append(abs(relative_threshold(lo) - t_n_rel))
    delta_pct_low.append(abs(percentile_threshold(lo) - t_n_pct))

fig, axes = plt.subplots(1, 2, figsize=(13, 5))
fig.suptitle("外れ値1件追加による閾値変動量 |Δ閾値|  — ノート件数 N との関係",
             fontsize=13, fontweight="bold")

panels = [
    (axes[0], delta_rel_high, delta_pct_high, f"高外れ値 (+{HIGH_OUTLIER}) を1件追加"),
    (axes[1], delta_rel_low,  delta_pct_low,  f"低外れ値 (+{LOW_OUTLIER}) を1件追加"),
]

for ax, d_rel, d_pct, title in panels:
    ax.plot(N_VALS, d_rel, color="#e74c3c", lw=2.5, label="相対足切り (range × 15%)")
    ax.plot(N_VALS, d_pct, color="#2980b9", lw=2.5, label="パーセンタイル足切り (60th)")
    ax.axvline(N_NOW, color="#555", lw=1.5, ls=":", label=f"現在 N = {N_NOW}")

    # N=100 の値をアノテーション
    idx_100 = N_VALS.index(100)
    for d, color, va in [(d_rel, "#e74c3c", "bottom"), (d_pct, "#2980b9", "top")]:
        ax.annotate(f"N=100\n|Δ|={d[idx_100]:.4f}",
                    xy=(100, d[idx_100]), xytext=(115, d[idx_100]),
                    fontsize=8, color=color, va=va,
                    arrowprops=dict(arrowstyle="->", color=color, lw=1))

    ax.set_title(title, fontsize=11)
    ax.set_xlabel("ノート件数 N", fontsize=10)
    ax.set_ylabel("|Δ閾値|  （大きいほど不安定）", fontsize=10)
    ax.legend(fontsize=9)
    ax.grid(alpha=0.3, linestyle=":")
    ax.set_xlim(5, 200)
    ax.set_ylim(bottom=0)

plt.tight_layout()
out = "threshold_scaling.png"
plt.savefig(out, dpi=150, bbox_inches="tight")
print(f"saved → {out}")
