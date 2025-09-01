
import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { CreditCard, Plus, Trash2, AlertTriangle } from 'lucide-react'
import { useBilling } from '@/hooks/useBilling'
import { toast } from 'sonner'

export default function BillingPanel() {
  const { paymentMethod, loading, setupCard, deleteCard } = useBilling()
  const [isSetupLoading, setIsSetupLoading] = useState(false)
  const [isDeleteLoading, setIsDeleteLoading] = useState(false)

  const handleSetupCard = async () => {
    try {
      setIsSetupLoading(true)
      await setupCard()
      toast.success('Payment method added successfully')
    } catch (error) {
      toast.error('Failed to add payment method')
    } finally {
      setIsSetupLoading(false)
    }
  }

  const handleDeleteCard = async () => {
    try {
      setIsDeleteLoading(true)
      const result = await deleteCard()
      toast.success('Payment method removed successfully')
      if (result.warning) {
        toast.warning(result.warning)
      }
    } catch (error) {
      toast.error('Failed to remove payment method')
    } finally {
      setIsDeleteLoading(false)
    }
  }

  const formatCardBrand = (brand: string) => {
    return brand.charAt(0).toUpperCase() + brand.slice(1)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Methods
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Methods
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {paymentMethod ? (
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="font-medium">
                    {formatCardBrand(paymentMethod.card_brand)} •••• {paymentMethod.card_last4}
                  </p>
                  <p className="text-sm text-gray-600">
                    Expires {paymentMethod.exp_month.toString().padStart(2, '0')}/{paymentMethod.exp_year}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Default</Badge>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isDeleteLoading}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        Remove Payment Method?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to remove this payment method? If you have an active subscription, 
                        future payments may fail without a valid payment method.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteCard}
                        disabled={isDeleteLoading}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {isDeleteLoading ? 'Removing...' : 'Remove Card'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
            <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-4">No payment method on file</p>
            <p className="text-sm text-gray-500 mb-4">
              Add a payment method to manage your subscription and make purchases.
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleSetupCard}
            disabled={isSetupLoading}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {paymentMethod ? 'Update Card' : 'Add Payment Method'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
