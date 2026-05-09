import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches

matplotlib.rcParams['font.family'] = ['MS Gothic', 'Yu Gothic', 'Meiryo', 'sans-serif']

# 等間隔13件 (t_normal=0.516 → 0.52と0.54が閾値付近に存在)
base_scores = np.array([0.48, 0.50, 0.52, 0.54, 0.56, 0.58, 0.60, 0.62, 0.64, 0.66, 0.68, 0.70, 0.72])

def relative_threshold(scores, ratio=0.15):
    return float(scores.min() + (scores.max() - scores.min()) * ratio)

def percentile_threshold(scores, p=60):
    return float(np.percentile(scores, p))

methods = [
    ("相対足切り\n(range × 15%)", relative_threshold, "#e74c3c"),
    ("パーセンタイル足切り\n(60th percentile)", percentile_threshold, "#2980b9"),
]

# ベースノートの x 座標は全列で共通（同じノートを視覚的に追跡できる）
np.random.seed(42)
x_base = np.random.uniform(-0.18, 0.18, len(base_scores))

COLOR_PASS = "#27ae60"  # 通過（変化なし）
COLOR_FAIL = "#bdc3c7"  # 除外（変化なし）
COLOR_FN   = "#c0392b"  # 偽陰性：通常→通過、外れ値→除外
COLOR_FP   = "#e67e22"  # 偽陽性：通常→除外、外れ値→通過
COLOR_OL   = "#8e44ad"  # 外れ値ノート自体

fig, axes = plt.subplots(2, 3, figsize=(14, 9), sharey=True)
fig.suptitle("足切り方式の比較：外れ値が通過ノートに与える影響", fontsize=14, fontweight="bold")

for row, (method_name, threshold_fn, line_color) in enumerate(methods):
    t_normal = threshold_fn(base_scores)
    normal_pass = base_scores >= t_normal  # ベースラインの通過フラグ

    for col, (title, scores, outlier_val) in enumerate([
        ("通常\n(13件)",          base_scores,               None),
        ("高外れ値あり\n(+0.92)", np.append(base_scores, 0.92), 0.92),
        ("低外れ値あり\n(+0.30)", np.append(base_scores, 0.30), 0.30),
    ]):
        ax = axes[row][col]
        t = threshold_fn(scores)
        delta = t - t_normal

        fn_count = fp_count = 0

        for i, (xi, yi) in enumerate(zip(x_base, base_scores)):
            was_pass = bool(normal_pass[i])
            now_pass = yi >= t

            if col == 0:
                c, size = (COLOR_PASS if was_pass else COLOR_FAIL), 95
            elif was_pass and now_pass:
                c, size = COLOR_PASS, 95
            elif not was_pass and not now_pass:
                c, size = COLOR_FAIL, 95
            elif was_pass and not now_pass:
                c, size = COLOR_FN, 150   # 偽陰性：★除外に転落
                fn_count += 1
            else:
                c, size = COLOR_FP, 150   # 偽陽性：★新たに通過
                fp_count += 1

            ax.scatter(xi, yi, color=c, s=size, zorder=3,
                       edgecolors="white", linewidths=0.7)

        # 外れ値ドット
        if outlier_val is not None:
            ax.scatter(0.0, outlier_val, color=COLOR_OL, s=140, zorder=4,
                       edgecolors="white", linewidths=0.7, marker="D")

        # 通過カウント（外れ値含む）
        pass_n = int(np.sum(scores >= t))
        total  = len(scores)

        ax.axhline(t, color=line_color, lw=2.5, ls="--",
                   label=f"閾値 = {t:.3f}")

        # タイトル
        if col == 0:
            title_str = f"{title}\n通過 {pass_n}/{total} 件"
        else:
            sign = "+" if delta >= 0 else ""
            change_parts = []
            if fn_count: change_parts.append(f"[赤] 除外に転落 {fn_count}件")
            if fp_count: change_parts.append(f"[橙] 新たに通過 {fp_count}件")
            change_str = "  ".join(change_parts) if change_parts else "（変化なし）"
            title_str = (
                f"{title}\n通過 {pass_n}/{total} 件  Δ閾値 {sign}{delta:.3f}\n"
                f"{change_str}"
            )

        ax.set_title(title_str, fontsize=9)
        ax.set_xlim(-0.5, 0.5)
        ax.set_xticks([])
        ax.set_ylim(0.20, 1.05)
        ax.legend(fontsize=9, loc="lower right")
        ax.grid(axis="y", alpha=0.3, linestyle=":")

        if col == 0:
            ax.set_ylabel(method_name, fontsize=11, color=line_color, fontweight="bold")

# 凡例
legend_handles = [
    mpatches.Patch(color=COLOR_PASS, label="通過（変化なし）"),
    mpatches.Patch(color=COLOR_FAIL, label="除外（変化なし）"),
    mpatches.Patch(color=COLOR_FN,   label="偽陰性：通常→通過 ➜ 外れ値で除外に"),
    mpatches.Patch(color=COLOR_FP,   label="偽陽性：通常→除外 ➜ 外れ値で通過に"),
    plt.scatter([], [], color=COLOR_OL, marker="D", s=80, label="外れ値ノート"),
]
fig.legend(handles=legend_handles, loc="lower center", ncol=3, fontsize=9,
           bbox_to_anchor=(0.5, -0.01))

plt.tight_layout(rect=[0, 0.07, 1, 1])
out = "threshold_comparison.png"
plt.savefig(out, dpi=150, bbox_inches="tight")
print(f"saved → {out}")
