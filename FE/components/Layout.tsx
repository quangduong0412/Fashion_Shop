import { PropsWithChildren } from 'react';
import { View } from 'react-native';
import { FashionFooter } from './fashion-footer';
import { FashionHeader } from './fashion-header';

export default function Layout({ children }: PropsWithChildren) {
  return <View style={{ flex: 1 }}><FashionHeader />{children}<FashionFooter /></View>;
}