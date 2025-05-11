import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";
import { config } from '@fortawesome/fontawesome-svg-core';
import '@fortawesome/fontawesome-svg-core/styles.css';
import dynamic from 'next/dynamic';

// サーバーサイドでのフォントアイコンロード時のエラーを回避
config.autoAddCss = false;

// 開発環境のみでロードされるコンポーネント
const DevTools = dynamic(() => import('../components/DevTools'), { ssr: false });

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Ember - 最新の記事をタイムライン形式で表示</title>
        <meta name="description" content="Emberは、最新の記事をタイムライン形式で表示するサービスです。" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Component {...pageProps} />
      <DevTools />
    </>
  );
}