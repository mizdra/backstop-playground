// モジュール拡張のためのおまじない
// ref: https://zenn.dev/qnighy/articles/9c4ce0f1b68350#%E3%83%A2%E3%82%B8%E3%83%A5%E3%83%BC%E3%83%AB%E6%8B%A1%E5%BC%B5
export {};

declare module 'backstopjs' {
  export interface Options {
    config?: Config | string | undefined;
    filter?: string | undefined;
    docker?: boolean;
  }
  export default function backstop(
    command: 'approve' | 'init' | 'reference' | 'test' | 'remote' | 'report',
    options?: Options,
  ): Promise<void>;
  export interface JSONReportTest {
    pair: {
      reference: string;
      test: string;
      selector: string;
      fileName: string;
      label: string;
      misMatchThreshold: number;
      url: string;
      expect: number;
      viewportLabel: string;
      error: string;
    };
    status: 'pass' | 'fail';
  }
  export interface JSONReport {
    testSuite: 'BackstopJS';
    tests: JSONReportTest[];
    id: string;
  }
}
