'use client';
import { usePathname } from 'next/navigation';
import { Fence, FenceProps } from '@nx/nx-dev/ui-fence';
import { useEffect, useState } from 'react';

const useUrlHash = (initialValue: string) => {
  const [hash, setHash] = useState(initialValue);

  useEffect(() => {
    const updateHash = () => {
      const hashValue = window.location.hash.replace(/^#/, '');
      setHash(hashValue);
    };

    window.addEventListener('hashchange', updateHash);
    updateHash();

    return () => {
      window.removeEventListener('hashchange', updateHash);
    };
  }, []);

  return hash;
};

export default function FenceWrapper(props: FenceProps) {
  const pathname = usePathname();
  const hash = useUrlHash('');

  useEffect(() => {
    const newUrl = `${pathname}#${hash}`;
    window.history.pushState({}, '', newUrl);
  }, [hash, pathname]);

  const modifiedProps: FenceProps = {
    ...props,
    selectedLineGroup: hash,
    onLineGroupSelectionChange: (selection: string) => {
      const newHash = `#${selection}`;
      window.location.hash = newHash;
    },
  };

  return (
    <div className="my-8 w-full">
      <Fence {...modifiedProps} />
    </div>
  );
}
