
import { HandCoins } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function TithesPage() {
  return (
    <div className="container mx-auto py-12 px-4">
      <section className="text-center mb-16">
        <h1 className="font-headline text-5xl font-bold text-primary mb-4">Gestión de Diezmos y Ofrendas</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Un espacio dedicado para administrar y registrar las contribuciones de la congregación.
        </p>
      </section>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4">
            <HandCoins className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-center font-headline text-2xl">Módulo en Desarrollo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">
            Esta sección está actualmente en construcción. Próximamente, aquí podrá registrar, visualizar y generar reportes de diezmos y ofrendas de manera segura y eficiente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
