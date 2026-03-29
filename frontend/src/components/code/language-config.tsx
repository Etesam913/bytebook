import { JSX } from 'react';
import { PythonLogo } from '../../icons/python-logo';
import { GolangLogo } from '../../icons/golang-logo';
import { JavascriptLogo } from '../../icons/javascript-logo';
import { JavaLogo } from '../../icons/java-logo';
import { SquareCode } from '../../icons/square-code';
import { Languages } from '../../types';

type LanguageDisplayConfig = {
  icon: JSX.Element;
  tabSize: number;
};

export const languageDisplayConfig: Record<Languages, LanguageDisplayConfig> = {
  python: {
    icon: <PythonLogo width="1.125rem" height="1.125rem" />,
    tabSize: 4,
  },
  go: {
    icon: <GolangLogo width="1.125rem" height="1.125rem" />,
    tabSize: 4,
  },
  javascript: {
    icon: <JavascriptLogo width="1.125rem" height="1.125rem" />,
    tabSize: 2,
  },
  java: {
    icon: <JavaLogo width="1.125rem" height="1.125rem" />,
    tabSize: 2,
  },
  text: {
    icon: <SquareCode width="1.125rem" height="1.125rem" />,
    tabSize: 2,
  },
};
