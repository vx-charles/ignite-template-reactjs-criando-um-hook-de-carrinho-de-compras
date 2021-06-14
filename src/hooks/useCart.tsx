import { createContext, ReactNode, useContext, useState } from 'react';
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
      localStorage.setItem('@rocketShoes:cart', JSON.stringify(updatedCart))
      toast.success('Produto adicionado no carrinho');

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      // TODO
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const stock = await api.get<Stock>(`stock/${productId}`)
      const stockAmount = stock.data.amount

      const updatedCart = [...cart]
      const productExists = updatedCart.find(product => productId === product.id)
      console.log(amount)
      if(stockAmount <= 0) {
        return;
      }

      if(amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if(productExists){
        setCart(updatedCart)
        localStorage.setItem('@rocketShoes:cart', JSON.stringify(updatedCart))
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
