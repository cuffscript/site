import type { CuffFile } from "../engine/types";

import hello from "./01_hello.cuff?raw";
import variablesAndScope from "./02_variables_and_scope.cuff?raw";
import collections from "./03_collections.cuff?raw";
import patternMatching from "./04_pattern_matching.cuff?raw";
import errorRecovery from "./05_error_recovery.cuff?raw";
import functionsRecursion from "./06_functions_recursion.cuff?raw";
import asyncOrdering from "./07_async_ordering.cuff?raw";
import dlcLibraries from "./08_dlc_libraries.cuff?raw";
import modulesMain from "./09_modules/main.cuff?raw";
import modulesGreetings from "./09_modules/lib/greetings.cuff?raw";
import comprehensiveMain from "./10_comprehensive/main.cuff?raw";
import comprehensiveStageData from "./10_comprehensive/maps/core_engine/stage_data.cuff?raw";

export interface ExampleProject {
  id: string;
  label: string;
  entryPath: string;
  files: CuffFile[];
}

export const EXAMPLES: ExampleProject[] = [
  {
    id: "hello",
    label: "1. Hello World",
    entryPath: "main.cuff",
    files: [{ path: "main.cuff", content: hello }],
  },
  {
    id: "variables",
    label: "2. 변수·상수·스코프",
    entryPath: "main.cuff",
    files: [{ path: "main.cuff", content: variablesAndScope }],
  },
  {
    id: "collections",
    label: "3. 컬렉션과 인덱싱",
    entryPath: "main.cuff",
    files: [{ path: "main.cuff", content: collections }],
  },
  {
    id: "pattern-matching",
    label: "4. 패턴 매칭 (정규식)",
    entryPath: "main.cuff",
    files: [{ path: "main.cuff", content: patternMatching }],
  },
  {
    id: "error-recovery",
    label: "5. 에러 복구 (or_else)",
    entryPath: "main.cuff",
    files: [{ path: "main.cuff", content: errorRecovery }],
  },
  {
    id: "functions",
    label: "6. 함수와 재귀",
    entryPath: "main.cuff",
    files: [{ path: "main.cuff", content: functionsRecursion }],
  },
  {
    id: "async-ordering",
    label: "7. 비동기 실행 순서",
    entryPath: "main.cuff",
    files: [{ path: "main.cuff", content: asyncOrdering }],
  },
  {
    id: "dlc",
    label: "8. 내장 라이브러리 (DLC)",
    entryPath: "main.cuff",
    files: [{ path: "main.cuff", content: dlcLibraries }],
  },
  {
    id: "modules",
    label: "9. 모듈 불러오기 (멀티파일)",
    entryPath: "main.cuff",
    files: [
      { path: "main.cuff", content: modulesMain },
      { path: "lib/greetings.cuff", content: modulesGreetings },
    ],
  },
  {
    id: "comprehensive",
    label: "10. 종합 데모 (멀티파일)",
    entryPath: "main.cuff",
    files: [
      { path: "main.cuff", content: comprehensiveMain },
      { path: "maps/core_engine/stage_data.cuff", content: comprehensiveStageData },
    ],
  },
];
