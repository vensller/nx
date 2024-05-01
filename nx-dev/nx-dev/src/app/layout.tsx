import '../../styles/main.css';
import { Header, Footer } from '@nx/nx-dev/ui-common';
import SeoComponent from './components/next-seo';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body>
        <SeoComponent />
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
