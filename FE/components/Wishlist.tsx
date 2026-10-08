import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiRequest, currentUser } from './fashion-data';

type State = { ids: number[]; ready: boolean; toggle: (id: number) => Promise<void> };
const WishlistContext = createContext<State>({ ids: [], ready: false, toggle: async () => undefined });
export function WishlistProvider({ children }: PropsWithChildren) {
  const path = usePathname();
  const [ids,setIds] = useState<number[]>([]), [ready,setReady] = useState(false);
  const [loadedPath,setLoadedPath]=useState('');
  const generation=useRef(0), locks=useRef(new Set<number>());
  useEffect(() => {
    const current=++generation.current;
    void (async()=>{ const user=await currentUser(); const result=user?.role==='user' ? await apiRequest('/shopping/wishlist/ids') : {ids:[]}; if(current===generation.current){setIds(result.ids);setReady(true);setLoadedPath(path);} })().catch(()=>{ if(current===generation.current){setIds([]);setReady(true);setLoadedPath(path);} });
    return ()=>{ generation.current=current+1; };
  },[path]);
  const toggle = async (id:number) => {
    if(locks.current.has(id)) return;
    locks.current.add(id);
    try {
      if((await currentUser())?.role!=='user') throw new Error('Đăng nhập tài khoản khách hàng để lưu yêu thích.');
      // Explicit PUT/DELETE reflects the displayed intent. A timeout retries that intent instead of flipping it.
      const saved=ids.includes(id), current=generation.current;
      await apiRequest(`/shopping/wishlist/${id}`,{method:saved?'DELETE':'PUT'});
      if(current===generation.current) setIds(previous=>saved?previous.filter(value=>value!==id):[...new Set([...previous,id])]);
    } finally { locks.current.delete(id); }
  };
  return <WishlistContext.Provider value={{ids:loadedPath===path?ids:[],ready:loadedPath===path&&ready,toggle}}>{children}</WishlistContext.Provider>;
}
export function FavoriteButton({ id, name }: {id:number;name:string}) {
  const {ids,ready,toggle}=useContext(WishlistContext), router=useRouter();
  const [busy,setBusy]=useState(false), [error,setError]=useState('');
  const locked=useRef(false), saved=ids.includes(id);
  return <View><Pressable accessibilityRole="button" accessibilityLabel={`${saved?'Bỏ yêu thích':'Yêu thích'} ${name}`} accessibilityState={{disabled:busy||!ready,selected:saved}} disabled={busy||!ready} onPress={async event=>{
    event.stopPropagation(); if(locked.current)return; locked.current=true;setBusy(true);setError('');
    try { if((await currentUser())?.role!=='user'){router.push({pathname:'/login',params:{returnTo:'/wishlist'}} as never);return;} await toggle(id); } catch(cause){setError(cause instanceof Error?cause.message:'Không thể lưu yêu thích.');} finally{locked.current=false;setBusy(false);}
  }} style={{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center',borderRadius:22,backgroundColor:'#fffaf8'}}>{busy?<ActivityIndicator color="#9f2438"/>:<MaterialIcons name={saved?'favorite':'favorite-border'} size={23} color="#9f2438"/>}</Pressable>{!!error&&<Text accessibilityRole="alert" style={{color:'#9f2438',maxWidth:180,fontSize:12}}>{error}</Text>}</View>;
}
