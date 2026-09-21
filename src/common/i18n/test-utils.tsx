import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { I18nProvider } from './components/I18nProvider';

export function renderWithI18n(ui: ReactNode) {
  return render(ui, {
    wrapper: ({ children }) => <I18nProvider initialLocale="ko">{children}</I18nProvider>,
  });
}
