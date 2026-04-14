import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Plus, Search, Package, Trash2, Edit2, AlertTriangle, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { logAction } from '../lib/audit';

export default function Products() {
  const { userData, company } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [newProduct, setNewProduct] = useState({
    code: '',
    name: '',
    description: '',
    price: 0,
    costPrice: 0,
    stockQuantity: 0,
    minStock: 5,
    unit: 'unité',
    category: 'Général'
  });

  useEffect(() => {
    if (!userData?.companyId) return;

    const q = query(
      collection(db, `companies/${userData.companyId}/products`),
      orderBy('name', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/products`);
    });

    return () => unsubscribe();
  }, [userData]);

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.code) {
      toast.error("Le nom et le code sont obligatoires.");
      return;
    }

    setLoading(true);
    try {
      const path = `companies/${userData.companyId}/products`;
      const docRef = await addDoc(collection(db, path), {
        ...newProduct,
        companyId: userData.companyId,
        createdAt: new Date().toISOString()
      });
      
      await logAction(userData!.companyId, userData!.uid, 'CREATE', 'products', docRef.id, newProduct);
      
      toast.success("Produit ajouté !");
      setIsAddOpen(false);
      setNewProduct({
        code: '',
        name: '',
        description: '',
        price: 0,
        costPrice: 0,
        stockQuantity: 0,
        minStock: 5,
        unit: 'unité',
        category: 'Général'
      });
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, `companies/${userData.companyId}/products`);
      toast.error("Erreur : " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct.name || !editingProduct.code) return;

    setLoading(true);
    try {
      const productRef = doc(db, `companies/${userData.companyId}/products`, editingProduct.id);
      const { id, ...updateData } = editingProduct;
      await updateDoc(productRef, updateData);
      
      await logAction(userData!.companyId, userData!.uid, 'UPDATE', 'products', id, updateData);
      
      toast.success("Produit mis à jour !");
      setIsEditOpen(false);
      setEditingProduct(null);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, `companies/${userData.companyId}/products/${editingProduct.id}`);
      toast.error("Erreur : " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Supprimer ce produit ?")) return;

    try {
      await deleteDoc(doc(db, `companies/${userData.companyId}/products`, id));
      await logAction(userData!.companyId, userData!.uid, 'DELETE', 'products', id, null);
      toast.success("Produit supprimé !");
    } catch (error: any) {
      handleFirestoreError(error, OperationType.DELETE, `companies/${userData.companyId}/products/${id}`);
      toast.error("Erreur : " + error.message);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stocks & Produits</h1>
          <p className="text-muted-foreground">Gérez votre catalogue d'articles et suivez vos niveaux de stock.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger render={
            <Button className="gap-2">
              <Plus size={18} />
              Nouveau Produit
            </Button>
          } />
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Ajouter un produit</DialogTitle>
              <DialogDescription>Enregistrez un nouvel article dans votre catalogue.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="code">Code Produit</Label>
                <Input 
                  id="code" 
                  value={newProduct.code}
                  onChange={(e) => setNewProduct({...newProduct, code: e.target.value.toUpperCase()})}
                  placeholder="ex: PRD-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nom du produit</Label>
                <Input 
                  id="name" 
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                  placeholder="ex: Ordinateur Portable"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input 
                  id="description" 
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Prix de vente ({company?.currency})</Label>
                <Input 
                  id="price" 
                  type="number"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({...newProduct, price: Number(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="costPrice">Prix d'achat ({company?.currency})</Label>
                <Input 
                  id="costPrice" 
                  type="number"
                  value={newProduct.costPrice}
                  onChange={(e) => setNewProduct({...newProduct, costPrice: Number(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">Stock Initial</Label>
                <Input 
                  id="stock" 
                  type="number"
                  value={newProduct.stockQuantity}
                  onChange={(e) => setNewProduct({...newProduct, stockQuantity: Number(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minStock">Stock d'alerte</Label>
                <Input 
                  id="minStock" 
                  type="number"
                  value={newProduct.minStock}
                  onChange={(e) => setNewProduct({...newProduct, minStock: Number(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unité</Label>
                <Select value={newProduct.unit} onValueChange={(v) => setNewProduct({...newProduct, unit: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unité">Unité</SelectItem>
                    <SelectItem value="kg">Kilogramme (kg)</SelectItem>
                    <SelectItem value="litre">Litre (L)</SelectItem>
                    <SelectItem value="mètre">Mètre (m)</SelectItem>
                    <SelectItem value="heure">Heure (h)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Catégorie</Label>
                <Input 
                  id="category" 
                  value={newProduct.category}
                  onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Annuler</Button>
              <Button onClick={handleAddProduct} disabled={loading}>
                {loading ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Produits</p>
                <h3 className="text-2xl font-bold">{products.length}</h3>
              </div>
              <div className="p-2 bg-primary/10 rounded-full text-primary">
                <Package size={20} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Alertes Stock</p>
                <h3 className="text-2xl font-bold text-rose-600">
                  {products.filter(p => p.stockQuantity <= p.minStock).length}
                </h3>
              </div>
              <div className="p-2 bg-rose-100 rounded-full text-rose-600">
                <AlertTriangle size={20} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Valeur Stock (Vente)</p>
                <h3 className="text-2xl font-bold">
                  {products.reduce((sum, p) => sum + (p.stockQuantity * p.price), 0).toLocaleString()} {company?.currency}
                </h3>
              </div>
              <div className="p-2 bg-emerald-100 rounded-full text-emerald-600">
                <ArrowUpRight size={20} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Valeur Stock (Achat)</p>
                <h3 className="text-2xl font-bold">
                  {products.reduce((sum, p) => sum + (p.stockQuantity * p.costPrice), 0).toLocaleString()} {company?.currency}
                </h3>
              </div>
              <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                <ArrowDownLeft size={20} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Inventaire</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Rechercher un produit..." 
                className="pl-10" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead className="text-right">Prix Vente</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Unité</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <TableRow key={product.id} className="group">
                    <TableCell className="font-mono text-xs">{product.code}</TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{product.category}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {product.price.toLocaleString()} {company?.currency}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      <span className={product.stockQuantity <= product.minStock ? "text-rose-600" : ""}>
                        {product.stockQuantity}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{product.unit}</TableCell>
                    <TableCell>
                      {product.stockQuantity <= 0 ? (
                        <Badge variant="destructive">Rupture</Badge>
                      ) : product.stockQuantity <= product.minStock ? (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">Alerte</Badge>
                      ) : (
                        <Badge variant="default" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">En stock</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingProduct(product);
                            setIsEditOpen(true);
                          }}
                        >
                          <Edit2 size={14} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteProduct(product.id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    Aucun produit trouvé.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier le produit</DialogTitle>
          </DialogHeader>
          {editingProduct && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-code">Code Produit</Label>
                <Input 
                  id="edit-code" 
                  value={editingProduct.code}
                  onChange={(e) => setEditingProduct({...editingProduct, code: e.target.value.toUpperCase()})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nom du produit</Label>
                <Input 
                  id="edit-name" 
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Input 
                  id="edit-description" 
                  value={editingProduct.description}
                  onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-price">Prix de vente</Label>
                <Input 
                  id="edit-price" 
                  type="number"
                  value={editingProduct.price}
                  onChange={(e) => setEditingProduct({...editingProduct, price: Number(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-costPrice">Prix d'achat</Label>
                <Input 
                  id="edit-costPrice" 
                  type="number"
                  value={editingProduct.costPrice}
                  onChange={(e) => setEditingProduct({...editingProduct, costPrice: Number(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-stock">Stock Actuel</Label>
                <Input 
                  id="edit-stock" 
                  type="number"
                  value={editingProduct.stockQuantity}
                  onChange={(e) => setEditingProduct({...editingProduct, stockQuantity: Number(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-minStock">Stock d'alerte</Label>
                <Input 
                  id="edit-minStock" 
                  type="number"
                  value={editingProduct.minStock}
                  onChange={(e) => setEditingProduct({...editingProduct, minStock: Number(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-unit">Unité</Label>
                <Select value={editingProduct.unit} onValueChange={(v) => setEditingProduct({...editingProduct, unit: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unité">Unité</SelectItem>
                    <SelectItem value="kg">Kilogramme (kg)</SelectItem>
                    <SelectItem value="litre">Litre (L)</SelectItem>
                    <SelectItem value="mètre">Mètre (m)</SelectItem>
                    <SelectItem value="heure">Heure (h)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category">Catégorie</Label>
                <Input 
                  id="edit-category" 
                  value={editingProduct.category}
                  onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Annuler</Button>
            <Button onClick={handleUpdateProduct} disabled={loading}>
              {loading ? "Mise à jour..." : "Mettre à jour"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
