# @mizdra/eco-backstopjs-runner

実行時間が最小になるよう設計された Backstop.js カスタムランナーです。

## Target users

- `referenceUrl` を使い、異なる環境同士のビジュアルリグレッションテストを実行しているユーザー

## How it works

このカスタムランナーは以下のように動作します。

1. 全シナリオに対して、`backstop test` を実行する
2. ステップ 1 で failed になったシナリオに対して、 `backstop reference` でリファレンスを再作成
3. ステップ 1 で failed になったシナリオに対して、再度 `backstop test` を実行する
4. HTML レポートを作成
   - ステップ 1 で passed なシナリオは passed としてレポートに記録されます
   - ステップ 1 では failed、ステップ 3 では passed なシナリオは passed としてレポートに記録されます
   - ステップ 1 では failed、ステップ 3 でも failed なシナリオは failed としてレポートに記録されます
5. 実行を終了する
   - レポートに failed なシナリオが 1 つでも記録されていれば、exit code 1 で、1 つもなければ exit code 0 で終了します

この挙動により、以下のようなメリットが得られます。

- 新規にシナリオを追加する際に、手動での reference の生成が不要になります
  - まだ reference のないシナリオがあっても、一度 reference を作成した上で test が実行されるためです
  - 自動生成された reference をリポジトリに commit するような CI を組めば、手動で reference を作成・commit する手間を省けます
- reference が古くなっている場合は、自動で reference 更新してから test を実行できます
  - reference が時間経過で変化するプロジェクトで有用です

## Install

```console
$ npm install -D @mizdra/eco-backstopjs-runner backstopjs
$ yarn add -D @mizdra/eco-backstopjs-runner backstopjs
```

## Usage

CLI インターフェイスは本家 Backstop.js と可能な限りの互換性を持たせています。ただし、カスタムランナーの内部で `reference`/`test` コマンドの制御をしているため、本家 Backstop.js にはあったサブコマンド (`test`/`reference`/`approve`/...) がありません。

```console
$ # basic
$ eco-backstop --config backstop.json

$ # JavaScript の設定ファイルを使う
$ eco-backstop --config backstop.config.js

$ # docker 経由で backstop を実行
$ eco-backstop --config backstop.json --docker

$ 特定のシナリオのみ実行
$ eco-backstop --config backstop.json --filter <scenarioLabelRegex>
```

また、設定ファイルにはいくつか必須要件があります。

- `id` が必須です
- `paths.bitmaps_reference` が必須です
- `paths.bitmaps_test` が必須です
- `paths.html_report` が必須です
- `paths.json_report` が必須です
- `report` が必須です
  - `"browser"`, `"json"` が含まれている必要があります

```json
// サンプル
{
  "id": "visual regression test",
  "paths": {
    "bitmaps_reference": "backstop_data/bitmaps_reference",
    "bitmaps_test": "backstop_data/bitmaps_test",
    "html_report": "backstop_data/html_report",
    "json_report": "backstop_data/json_report"
  },
  "report": ["browser", "json"]
  // ...
}
```
