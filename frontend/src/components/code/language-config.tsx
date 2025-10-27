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
    icon: <PythonLogo width={18} height={18} />,
    tabSize: 4,
  },
  go: {
    icon: <GolangLogo width={18} height={18} />,
    tabSize: 4,
  },
  javascript: {
    icon: <JavascriptLogo width={18} height={18} />,
    tabSize: 2,
  },
  java: {
    icon: <JavaLogo width={18} height={18} />,
    tabSize: 2,
  },
  text: {
    icon: <SquareCode width={18} height={18} />,
    tabSize: 2,
  },
};
