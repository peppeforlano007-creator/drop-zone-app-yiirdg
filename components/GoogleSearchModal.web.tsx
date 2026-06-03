import { useEffect } from 'react';
import { Linking } from 'react-native';

interface GoogleSearchModalProps {
  visible: boolean;
  onClose: () => void;
  productName: string;
}

export default function GoogleSearchModal({ visible, onClose, productName }: GoogleSearchModalProps) {
  useEffect(() => {
    if (!visible) return;
    const url = `https://www.google.com/search?q=${encodeURIComponent(productName)}`;
    console.log('[GoogleSearchModal.web] Opening Google search for:', productName, url);
    Linking.openURL(url).catch((err) => console.error('[GoogleSearchModal.web] openURL failed:', err));
    onClose();
  }, [visible, productName, onClose]);

  return null;
}
