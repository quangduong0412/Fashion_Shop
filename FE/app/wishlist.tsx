import { useCallback, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiRequest, currentUser, productImageUrl, formatPrice } from '../components/fashion-data';
import CatalogImage from '../components/CatalogImage';

export default function WishlistScreen(){
  const router=useRouter(),insets=useSafeAreaInsets(),generation=useRef(0);
  const [items,setItems]=useState<any[]>([]),[page,setPage]=useState(1),[pages,setPages]=useState(0),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const load=useCallback(async()=>{ const current=++generation.current;setItems([]);setLoading(true);setError('');try{
    if((await currentUser())?.role!=='user'){router.replace({pathname:'/login',params:{returnTo:'/wishlist'}} as never);return;}
    const result=await apiRequest(`/shopping/wishlist?page=${page}&pageSize=20`);if(current===generation.current){setItems(result.items);setPages(result.totalPages);}
  }catch(cause){if(current===generation.current)setError(cause instanceof Error?cause.message:'Không thể tải yêu thích.');}finally{if(current===generation.current)setLoading(false);}},[page,router]);
  useFocusEffect(useCallback(()=>{void load();return()=>{generation.current++;};},[load]));
  return <ScrollView style={{flex:1,backgroundColor:'#f7f5ef'}} contentContainerStyle={{padding:20,paddingTop:insets.top+20,paddingBottom:insets.bottom+30}}><View style={{width:'100%',maxWidth:760,alignSelf:'center',gap:16}}>
    <Pressable accessibilityRole="button" onPress={()=>router.canGoBack()?router.back():router.replace('/profile' as never)}><Text>← Tài khoản</Text></Pressable><Text style={{fontFamily:'Inter',fontWeight:'700',fontSize:26}}>Sản phẩm yêu thích</Text><Text style={{color:'#81776f'}}>Lưu theo tài khoản, đồng bộ trên các thiết bị.</Text>
    {loading?<ActivityIndicator color="#9f2438"/>:!error&&!items.length?<Text>Chưa có sản phẩm yêu thích. Khám phá bộ sưu tập để lưu thiết kế bạn thích.</Text>:null}
    {!!error&&<><Text accessibilityRole="alert" style={{color:'#9f2438'}}>{error}</Text><Pressable accessibilityRole="button" onPress={()=>void load()}><Text>Thử lại</Text></Pressable></>}
    {items.map(item=><View key={item.productId} style={{padding:16,borderRadius:16,backgroundColor:'#fffefa',gap:10}}><View style={{flexDirection:'row',gap:16}}><CatalogImage source={productImageUrl(item.product.image)} label={item.product.name} style={{width:88,height:100,borderRadius:10}}/><View style={{flex:1,gap:8}}><Text style={{fontFamily:'Inter',fontWeight:'700'}}>{item.product.name}</Text><Text>{item.available?formatPrice(item.product.price):'Sản phẩm hiện không còn hiển thị'}</Text>{item.available&&<Pressable accessibilityRole="button" accessibilityLabel={`Xem yêu thích ${item.product.name}`} onPress={()=>router.push(`/product/${item.productId}` as never)}><Text style={{color:'#9f2438'}}>Xem sản phẩm →</Text></Pressable>}</View></View><Pressable disabled={busy} accessibilityRole="button" accessibilityLabel={`Bỏ lưu ${item.product.name}`} onPress={async()=>{setBusy(true);setError('');try{await apiRequest(`/shopping/wishlist/${item.productId}`,{method:'DELETE'});if(items.length===1&&page>1)setPage(page-1);else await load();}catch(cause){setError(cause instanceof Error?cause.message:'Không thể bỏ lưu.');}finally{setBusy(false);}}}><Text style={{color:'#9f2438',paddingVertical:8}}>Bỏ lưu</Text></Pressable></View>)}
    {!loading&&<View style={{flexDirection:'row',justifyContent:'space-between'}}><Pressable accessibilityRole="button" disabled={page<=1} onPress={()=>setPage(page-1)}><Text style={{opacity:page<=1?0.4:1,padding:12}}>← Trước</Text></Pressable><Text style={{padding:12}}>Trang {page}/{Math.max(1,pages)}</Text><Pressable accessibilityRole="button" disabled={page>=pages} onPress={()=>setPage(page+1)}><Text style={{opacity:page>=pages?0.4:1,padding:12}}>Sau →</Text></Pressable></View>}
  </View></ScrollView>;
}
