# TripAdvisor掲載・運用代行LP（設定待ちの制作版）

既存デザインを維持し、HTML/CSS/JS/画像を分離。Cloudflare Pages FunctionsでZapierへ中継します。まだ本番公開・実送信・広告計測は有効ではありません。

## 必要な情報

- 本番URL：https://wizcloud-inbound.com（設定済み）
- GTMコンテナID：GTM-TMLM9JKX（組み込み済み）
- Zapier Catch Hook URL：コードに書かずCloudflareのSecretへ登録
- 会社概要 /company/、プライバシーポリシー /policy/（作成済み）
- Google広告の2種類のCV ID/ラベル（GTMに設定済みなら追加共有不要）

## 公開前に仕上げる箇所

js/config.js の productionOrigin・gtmIdは設定済み。計測方式は確定済みのsuccessです。
GTMはGoogle公式の現行head側スニペットに合わせて実装。旧形式のnoscriptは重複追加しません。4ページとも共通コードを読み込み、本番origin一致時のみコンテナを1回ロードします。
会社概要・プライバシーポリシーを作成し、フッターとフォームからリンクしました。ポリシー本文は指定の公式ページ（2024年11月1日改定版）を2026年11月10日に取得した内容です。
確認済みブランドのfavicon、OGP、sitemap、本文と一致するJSON-LDは本番URL等の確定後に追加します。元の事例・画像内の統計値や順位の出典・時点は公開担当者による確認が必要です。
現状は制作版のためindex.htmlのnoindexとrobots.txtのDisallow: /が有効です。本番公開時に解除し、Previewは別設定でnoindexを維持します。thanks.htmlは常にnoindexです。

## Cloudflare設定

GitHub Privateリポジトリにこのフォルダの中身を配置します。mainを本番、devをPreviewにします。
PagesでGit連携。Framework None、ビルドコマンドexit 0、出力ディレクトリはルート（.）。
Functionsを含むため、Cloudflare管理画面でのドラッグ＆ドロップだけで公開しないでください。

ProductionのVariables and Secretsに以下を登録し、再デプロイします。

| 名前 | 値 |
| --- | --- |
| ZAPIER_WEBHOOK_URL | Catch Hook URL（Secretとして登録） |
| PRODUCTION_ORIGIN | 本番URL。js/config.jsと一致させる |
| FORM_ENABLED | true |

PreviewではFORM_ENABLED=false、Webhook Secretは未設定。js/config.jsの本番origin制限でGTMも停止します。
テストには別のテスト用Zap・GTMを用意します。SecretはGitHub、HTML、READMEに貼りません。

## GTMの設定

1. Google広告の電話クリック・フォーム送信の2アクションを作成。リード用途のカウントは「初回」を基本とする。
2. 必要なGoogleタグ・コンバージョンリンカーを設定。
3. カスタムイベントトリガー phone_click_cv → 電話用Google広告CVタグ。
4. カスタムイベントトリガー form_submit_cv → フォーム用Google広告CVタグ。
5. データレイヤー変数 submission_id をフォームCVタグのトランザクションIDへ設定。
6. thanks.htmlのページビューや通常のフォーム送信クリックにはCVタグを設定しない。
7. Preview / Tag Assistantで電話クリック、API成功、API失敗、サンクス遷移の順とタグ発火を確認し、GTMを公開。

電話CVはクリック数であり通話成立数ではありません。個人情報はdataLayerに送りません。必要な同意管理は運用地域・社内方針に合わせて公開前に確定してください。

## フォーム

ブラウザ → /api/contact → Zapier成功応答 → form_submit_cv → 最大2秒待ってthanks.html。
Zapier受信成功は、後段CRM・メール配送までの成功を保証しません。Zap履歴と最終保存先を別途確認してください。

転送するフォームキー：company, name, tel, email, message, purpose, business_confirm。
広告キー：utm_source, utm_medium, utm_campaign, utm_term, utm_content, adgroup, placement, keyword, matchtype, gclid, wbraid, gbraid, fbclid。
その他：lpv, sl, lp_path, source_url, referrer, _elapsed_ms, submission_id, submitted_at（UTC）, country。
IP・user_agentは保管方針未確定のため収集しません。URLに個人情報を載せる運用は避けてください。
Zapier後段でフォーム項目をマッピングし、submitted_atをAsia/Tokyoへ変換。解約サービス用のガイド固有項目は今回のフォームには含めません。

サーバー側で必須・形式・対象者・選択肢・Origin・入力時間・ハニーポット・サイズを検証します。
送信中ボタンを無効化します。受信済みか不明な通信切断時に自動再送はしません。
永続的な送信重複排除・分散レート制限は未実装です。公開時はCloudflare側の/api/contactレート制限などを必要に応じ設定してください。

## 検証状況

ローカルで13ケースのAPIテストを実施（成功、入力不備、対象外、bot、環境制限、Webhook未設定、外部エラー・タイムアウト）。外部への実送信なし。
ブラウザでLP表示と対象外分岐を確認。PC/SP全指定幅の検証、実Cloudflare、Zapier受信、GTM Preview、Google広告への計測は設定後に実施する必要があります。

## 今回のPagesプロジェクト

tripadvisor-support-wizcloud-lp のカスタムドメインに wizcloud-inbound.com を追加します。プロジェクト名は変更不要です。
ProductionのPRODUCTION_ORIGINは https://wizcloud-inbound.com に設定します。
独自ドメインの接続と、この更新版コードのGitHubへの反映は別作業です。
