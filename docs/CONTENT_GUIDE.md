# 教材を追加する

教材本文はまだ決定しません。`dist/src/content.js` の `lessons` 配列へオブジェクトを追加すると、教材選択に表示されます。各教材の作業状態は端末内で個別に保存されます。

## 教材のデータ

```js
{
  id: 'unique-lesson-id',
  title: '教材タイトル',
  label: '入門',
  description: '短い説明',
  board: 'raspberry-pi-4',
  steps: [{ title: '手順名', text: '手順の説明' }],
  components: [
    { id: 'r1', type: 'resistor', x: 440, y: 260, value: 330 },
    { id: 'led1', type: 'led', x: 650, y: 245 }
  ],
  starterCode: 'from gpiozero import LED\n',
  answer: {
    wires: [
      { a: 'pi:11', b: 'r1:1' },
      { a: 'r1:2', b: 'led1:A' },
      { a: 'led1:K', b: 'pi:6' }
    ],
    code: 'from gpiozero import LED\nled = LED(17)\nled.on()\n',
    connections: [
      ['GPIO 17 · 物理11', '抵抗 · 1'],
      ['抵抗 · 2', 'LED · A（＋）'],
      ['LED · K（−）', 'GND · 物理6']
    ]
  },
  checks: [
    { kind: 'path', from: 'pi:11', to: 'led1:A', viaType: 'resistor', label: '抵抗を経由する' },
    { kind: 'path', from: 'led1:K', to: 'pi:6', label: 'GNDへつなぐ' },
    { kind: 'output', component: 'led1', label: 'LEDを点灯する' }
  ]
}
```

- `pi:11` は **物理11番**。Pythonの `LED(17)` は **BCM 17**。番号を混同しないでください。
- LED端子は `A` と `K`、抵抗は `1` と `2`、ボタンは `1l` / `1r` / `2l` / `2r`、ブザーは `+` / `-`。
- ボタンの1Lと1R、2Lと2Rは常につながっています。押すと1と2のグループがつながります。
- 作業台の座標は850 × 560。部品は画像左上を座標原点とします。配置は初期状態と答えで共通です。
- 本文は文字列として表示します。HTMLを渡さないでください。
- コードは任意のPythonに見えますが、実行可能なAPIは `PYTHON_RUNTIME.md` に記載した範囲です。新規部品の追加には回路モデルと必要なPython APIを実装します。
- `path` 条件は経路の有無を判定します。正確な回路の合否には検出結果・実行結果も併用します。

## 教材投入時の確認

1. 手順・配線の文字説明・配線データ・答えのコードを一致させる。
2. 正解配線でコードを実行できることを確認する。
3. 誤配線時に誤って達成済みにならないことを確認する。
4. 初期状態から人が手動操作して到達できることを確認する。

記事数はプラットフォームから独立しています。大量の教材を入れる場合は各教材を別ファイルに分け、manifestから取り込む構成に移行できます。
