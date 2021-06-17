import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');
    
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    
    return [];
  });

  const prevCartRef = useRef<Product[]>();

  useEffect(() => {
    prevCartRef.current = cart
  }, [cart])

  const cartPreviousValue = prevCartRef.current ?? cart; // se o valor da esquerda for false ou nulo ou undefined, ele vai atribuir o valor da direita.

  useEffect(() => {
    if(cartPreviousValue !== cart) { // atualiza o locaStorage quando o cart é alterado.
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))
    }
  }, [cartPreviousValue, cart])

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart] // fica um novo array com os valores de cart na variável, fazendo a imutabilidade.
      const productExists = updatedCart.find(product => productId === product.id)

      const stock = await api.get(`stock/${productId}`)

      const stockAmount = stock.data.amount
      const currentAmount = productExists ? productExists.amount : 0
      const amount = currentAmount + 1

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if(productExists) {
        productExists.amount = amount // atualiza somente a quantidade no carrinho quando o produto existe
      } else {
        const product = await api.get(`products/${productId}`)
        const newProduct = {
          ...product.data,
          amount: 1 // add inicialmente 1 na quantidade quando o produto é add pela primeira vez.
        }
        updatedCart.push(newProduct) // add um produto novo no array, seguindo a imutabilidade.
      }

      setCart(updatedCart)      
      toast.success('Produto adicionado no carrinho');

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart]
      const productIndex = updatedCart.findIndex(product => productId === product.id) // resultado do index = 0 se tiver 2 produtos.

      if(productIndex >= 0) { // Maior que 0, pois o se não encontrar, será -1.
        updatedCart.splice(productIndex, 1)
        setCart(updatedCart)
      } else {
        throw Error()
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0) { // se a quantidade desejada for menor ou igual a 0, já sai instantaneamente.
        return;
      }

      const stock = await api.get<Stock>(`stock/${productId}`)
      const stockAmount = stock.data.amount

      const updatedCart = [...cart]
      const productExists = updatedCart.find(product => productId === product.id)

      if(amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if(productExists){
        productExists.amount = amount
        setCart(updatedCart)
      } else {
        throw Error();
      }

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
