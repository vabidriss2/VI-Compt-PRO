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
import { 
  Plus, 
  Search, 
  Package, 
  Trash2, 
  Edit2, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History, 
  Download, 
  Filter, 
  BarChart3, 
  Tag, 
  Layers,
  MoreVertical,
  ChevronRight,
  Box,
  TrendingUp,
  TrendingDown,
  Info,
  CheckCircle2,
  AlertCircle,
  FileText,
  FileJson,
  ArrowRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { logAction } from '../lib/audit';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

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
    category: 'Général',
    salesAccount: '707000',
    purchaseAccount: '607000',
    vatRate: 20
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
        category: 'Général',
        salesAccount: '707000',
        purchaseAccount: '607000',
        vatRate: 20
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
          <p className="text-muted-foreground">Gérez votre catalogue d'articles, suivez vos niveaux de stock et configurez vos comptes comptables.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-10 px-4 text-[10px] font-black uppercase tracking-widest border-slate-200 hover:bg-slate-50 gap-2">
            <Download size={14} /> Exporter
          </Button>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger>
              <Button className="h-10 px-6 text-[10px] font-black uppercase tracking-widest gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-100">
                <Plus size={18} />
                Nouveau Produit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl border-none shadow-2xl">
              <DialogHeader className="bg-slate-50 p-6 border-b">
                <DialogTitle className="text-xs font-black uppercase tracking-widest text-slate-700">Ajouter un Produit au Catalogue</DialogTitle>
                <DialogDescription className="text-[10px] font-medium">Enregistrez un nouvel article avec ses paramètres de vente et d'achat.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-6 p-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Code Article (SKU)</Label>
                  <Input 
                    value={newProduct.code}
                    onChange={(e) => setNewProduct({...newProduct, code: e.target.value.toUpperCase()})}
                    placeholder="ex: PRD-001"
                    className="h-10 text-xs font-bold border-slate-200 focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Désignation</Label>
                  <Input 
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                    placeholder="ex: Ordinateur Portable"
                    className="h-10 text-xs font-bold border-slate-200 focus:border-indigo-500"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Description détaillée</Label>
                  <Input 
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                    className="h-10 text-xs font-medium border-slate-200 focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Prix de Vente ({company?.currency})</Label>
                  <Input 
                    type="number"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({...newProduct, price: Number(e.target.value)})}
                    className="h-10 text-xs font-mono font-bold border-slate-200 focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Prix d'Achat ({company?.currency})</Label>
                  <Input 
                    type="number"
                    value={newProduct.costPrice}
                    onChange={(e) => setNewProduct({...newProduct, costPrice: Number(e.target.value)})}
                    className="h-10 text-xs font-mono font-bold border-slate-200 focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Stock Initial</Label>
                  <Input 
                    type="number"
                    value={newProduct.stockQuantity}
                    onChange={(e) => setNewProduct({...newProduct, stockQuantity: Number(e.target.value)})}
                    className="h-10 text-xs font-mono font-bold border-slate-200 focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Seuil d'Alerte</Label>
                  <Input 
                    type="number"
                    value={newProduct.minStock}
                    onChange={(e) => setNewProduct({...newProduct, minStock: Number(e.target.value)})}
                    className="h-10 text-xs font-mono font-bold border-slate-200 focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Unité de mesure</Label>
                  <Select value={newProduct.unit} onValueChange={(v) => setNewProduct({...newProduct, unit: v})}>
                    <SelectTrigger className="h-10 text-xs font-bold border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="text-xs font-bold">
                      <SelectItem value="unité">Unité</SelectItem>
                      <SelectItem value="kg">Kilogramme (kg)</SelectItem>
                      <SelectItem value="litre">Litre (L)</SelectItem>
                      <SelectItem value="mètre">Mètre (m)</SelectItem>
                      <SelectItem value="heure">Heure (h)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Catégorie</Label>
                  <Input 
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                    className="h-10 text-xs font-bold border-slate-200 focus:border-indigo-500"
                  />
                </div>
              </div>
              <DialogFooter className="bg-slate-50 p-6 border-t">
                <Button variant="ghost" onClick={() => setIsAddOpen(false)} className="text-[10px] font-black uppercase tracking-widest">Annuler</Button>
                <Button onClick={handleAddProduct} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-[10px] font-black uppercase tracking-widest px-8">
                  {loading ? "Enregistrement..." : "Confirmer l'Ajout"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-slate-200 shadow-sm overflow-hidden group hover:border-indigo-300 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Références</p>
                <h3 className="text-3xl font-black text-slate-900">{products.length}</h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                <Box size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm overflow-hidden group hover:border-rose-300 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Alertes Stock</p>
                <h3 className="text-3xl font-black text-rose-600">
                  {products.filter(p => p.stockQuantity <= p.minStock).length}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 group-hover:scale-110 transition-transform">
                <AlertTriangle size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm overflow-hidden group hover:border-emerald-300 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Valeur Vente</p>
                <h3 className="text-2xl font-black text-emerald-600">
                  {products.reduce((sum, p) => sum + (p.stockQuantity * p.price), 0).toLocaleString()} <span className="text-xs">{company?.currency}</span>
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                <TrendingUp size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm overflow-hidden group hover:border-blue-300 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Valeur Achat</p>
                <h3 className="text-2xl font-black text-blue-600">
                  {products.reduce((sum, p) => sum + (p.stockQuantity * p.costPrice), 0).toLocaleString()} <span className="text-xs">{company?.currency}</span>
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                <TrendingDown size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="inventory" className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <TabsList className="bg-slate-100 p-1 h-11 border border-slate-200 shadow-sm">
            <TabsTrigger value="inventory" className="gap-2 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm px-6">
              <Layers size={14} /> Inventaire Global
            </TabsTrigger>
            <TabsTrigger value="movements" className="gap-2 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm px-6">
              <History size={14} /> Journal des Mouvements
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm px-6">
              <BarChart3 size={14} /> Analyses de Rotation
            </TabsTrigger>
          </TabsList>
          
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Référence, désignation, catégorie..." 
              className="pl-10 h-10 text-xs font-bold border-slate-200 focus:border-indigo-500 shadow-sm" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <TabsContent value="inventory" className="m-0">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50 border-b">
                    <TableHead className="w-[120px] text-[10px] font-black uppercase tracking-widest">Référence</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Désignation Produit</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Catégorie</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">P.U. Vente</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Stock Réel</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Comptabilisation</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Disponibilité</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((product) => (
                      <TableRow key={product.id} className="group hover:bg-slate-50/50 transition-colors border-b last:border-0">
                        <TableCell className="font-mono text-[10px] font-black text-indigo-600">{product.code}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-xs text-slate-900">{product.name}</span>
                            <span className="text-[10px] text-slate-400 font-medium line-clamp-1">{product.description}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-slate-50 border-slate-200 text-slate-600">
                            <Tag size={10} className="mr-1.5" />
                            {product.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-black text-xs text-slate-900">
                          {product.price.toLocaleString()} <span className="text-[10px] text-slate-400">{company?.currency}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end">
                            <span className={cn(
                              "text-xs font-black",
                              product.stockQuantity <= product.minStock ? "text-rose-600" : "text-emerald-600"
                            )}>
                              {product.stockQuantity}
                            </span>
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{product.unit}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">V: {product.salesAccount || '707000'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">A: {product.purchaseAccount || '607000'}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {product.stockQuantity <= 0 ? (
                            <Badge className="bg-rose-500 text-white border-none text-[8px] h-4 px-2 font-black uppercase tracking-widest">Rupture</Badge>
                          ) : product.stockQuantity <= product.minStock ? (
                            <Badge className="bg-amber-500 text-white border-none text-[8px] h-4 px-2 font-black uppercase tracking-widest">Alerte</Badge>
                          ) : (
                            <Badge className="bg-emerald-500 text-white border-none text-[8px] h-4 px-2 font-black uppercase tracking-widest">Optimal</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="h-8 w-8 text-indigo-600 hover:bg-indigo-50 rounded-full"
                                    onClick={() => {
                                      setEditingProduct(product);
                                      setIsEditOpen(true);
                                    }}
                                  >
                                    <Edit2 size={14} />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="text-[10px] font-black uppercase tracking-widest">Modifier la fiche</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-full"
                                    onClick={() => handleDeleteProduct(product.id)}
                                  >
                                    <Trash2 size={14} />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="text-[10px] font-black uppercase tracking-widest text-rose-500">Supprimer l'article</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-24">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-200">
                            <Package size={32} />
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Aucun produit trouvé</p>
                            <p className="text-[10px] text-slate-400 font-medium">Ajustez vos filtres ou créez une nouvelle référence.</p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="movements">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardContent className="py-24 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4 text-slate-200">
                <History size={32} />
              </div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 mb-2">Historique des Mouvements</h3>
              <p className="text-[10px] text-slate-400 font-medium max-w-xs mx-auto">
                Le suivi détaillé des entrées, sorties et transferts de stock sera disponible dans la prochaine mise à jour.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardContent className="py-24 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4 text-slate-200">
                <BarChart3 size={32} />
              </div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 mb-2">Analyses Prédictives</h3>
              <p className="text-[10px] text-slate-400 font-medium max-w-xs mx-auto">
                Visualisez la rotation de vos stocks et anticipez vos besoins de réapprovisionnement grâce à nos algorithmes d'analyse.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl border-none shadow-2xl">
          <DialogHeader className="bg-slate-50 p-6 border-b">
            <DialogTitle className="text-xs font-black uppercase tracking-widest text-slate-700">Mise à jour de la Fiche Produit</DialogTitle>
          </DialogHeader>
          {editingProduct && (
            <div className="grid grid-cols-2 gap-6 p-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Code Article</Label>
                <Input 
                  value={editingProduct.code}
                  onChange={(e) => setEditingProduct({...editingProduct, code: e.target.value.toUpperCase()})}
                  className="h-10 text-xs font-bold border-slate-200 focus:border-indigo-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Désignation</Label>
                <Input 
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                  className="h-10 text-xs font-bold border-slate-200 focus:border-indigo-500"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Description</Label>
                <Input 
                  value={editingProduct.description}
                  onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})}
                  className="h-10 text-xs font-medium border-slate-200 focus:border-indigo-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Prix de Vente</Label>
                <Input 
                  type="number"
                  value={editingProduct.price}
                  onChange={(e) => setEditingProduct({...editingProduct, price: Number(e.target.value)})}
                  className="h-10 text-xs font-mono font-bold border-slate-200 focus:border-indigo-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Prix d'Achat</Label>
                <Input 
                  type="number"
                  value={editingProduct.costPrice}
                  onChange={(e) => setEditingProduct({...editingProduct, costPrice: Number(e.target.value)})}
                  className="h-10 text-xs font-mono font-bold border-slate-200 focus:border-indigo-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Stock Actuel</Label>
                <Input 
                  type="number"
                  value={editingProduct.stockQuantity}
                  onChange={(e) => setEditingProduct({...editingProduct, stockQuantity: Number(e.target.value)})}
                  className="h-10 text-xs font-mono font-bold border-slate-200 focus:border-indigo-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Seuil d'Alerte</Label>
                <Input 
                  type="number"
                  value={editingProduct.minStock}
                  onChange={(e) => setEditingProduct({...editingProduct, minStock: Number(e.target.value)})}
                  className="h-10 text-xs font-mono font-bold border-slate-200 focus:border-indigo-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Unité</Label>
                <Select value={editingProduct.unit} onValueChange={(v) => setEditingProduct({...editingProduct, unit: v})}>
                  <SelectTrigger className="h-10 text-xs font-bold border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs font-bold">
                    <SelectItem value="unité">Unité</SelectItem>
                    <SelectItem value="kg">Kilogramme (kg)</SelectItem>
                    <SelectItem value="litre">Litre (L)</SelectItem>
                    <SelectItem value="mètre">Mètre (m)</SelectItem>
                    <SelectItem value="heure">Heure (h)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Catégorie</Label>
                <Input 
                  value={editingProduct.category}
                  onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})}
                  className="h-10 text-xs font-bold border-slate-200 focus:border-indigo-500"
                />
              </div>
            </div>
          )}
          <DialogFooter className="bg-slate-50 p-6 border-t">
            <Button variant="ghost" onClick={() => setIsEditOpen(false)} className="text-[10px] font-black uppercase tracking-widest">Annuler</Button>
            <Button onClick={handleUpdateProduct} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-[10px] font-black uppercase tracking-widest px-8">
              {loading ? "Mise à jour..." : "Enregistrer les Modifications"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
