'use client';
import { Fence, FenceProps } from '@nx/nx-dev/ui-fence';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const useUrlHash = (initialValue: string) => {
  const [hash, setHash] = useState(initialValue);

  const updateHash = (str: string) => {
    if (!str) return;
    setHash(str.split('#')[1]);
  };

  useEffect(() => {
    const onWindowHashChange = () => updateHash(window.location.hash);

    window.addEventListener('hashchange', onWindowHashChange);
    window.addEventListener('load', onWindowHashChange);
    return () => {
      window.removeEventListener('load', onWindowHashChange);
      window.removeEventListener('hashchange', onWindowHashChange);
    };
  }, []);

  return hash;
};

export default function FenceWrapper(props: FenceProps) {
  const { push } = useRouter();
  const pathName = usePathname();
  const hash = decodeURIComponent(useUrlHash(''));

  const modifiedProps: FenceProps = {
    ...props,
    selectedLineGroup: hash,
    onLineGroupSelectionChange: (selection: string) => {
      push(pathName.split('#')[0] + '#' + selection);
    },
  };
  return (
    <div className="my-8 w-full">
      <Fence {...modifiedProps} />
    </div>
  );
}
