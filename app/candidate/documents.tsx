import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    CANDIDATE_DOCUMENT_TYPES,
    MAX_DOCUMENT_SIZE_BYTES,
    deleteCandidateDocument,
    getCandidateDocumentTypeLabel,
    listCandidateDocuments,
    resolveStoragePathUrl,
    saveCandidateCv,
    uploadCandidateDocument,
    validateCandidateDocumentFile,
    type CandidateDocumentRecord,
    type CandidateDocumentTypeKey,
} from '../../lib/candidate-documents';
import { debugDuplicateKeys, debugExactUuidInList } from '../../lib/debug-duplicate-keys';

const formatBytes = (bytes?: number) => {
  if (typeof bytes !== 'number' || Number.isNaN(bytes) || bytes <= 0) {
    return '0 Ko';
  }
  if (bytes < 1024) {
    return `${bytes} o`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} Ko`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};

export default function CandidateDocumentsScreen() {
  const router = useRouter();
  const [documents, setDocuments] = useState<CandidateDocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedType, setSelectedType] = useState<CandidateDocumentTypeKey>('cv');
  const [customType, setCustomType] = useState('');
  const [typesScrollX, setTypesScrollX] = useState(0);

  const typesScrollRef = useRef<ScrollView>(null);
  const TYPES_SCROLL_STEP = 180;

  const handleScrollLeft = () => {
    typesScrollRef.current?.scrollTo({
      x: Math.max(0, typesScrollX - TYPES_SCROLL_STEP),
      animated: true,
    });
  };

  const handleScrollRight = () => {
    typesScrollRef.current?.scrollTo({
      x: typesScrollX + TYPES_SCROLL_STEP,
      animated: true,
    });
  };

  const loadDocuments = useCallback(async () => {
    try {
      setError(null);
      const data = await listCandidateDocuments();
      setDocuments(data);
    } catch (_error) {
      setError('Impossible de charger vos documents.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDocuments();
  };

  const stats = useMemo(() => {
    const totalSize = documents.reduce((sum, doc) => sum + (doc.size ?? 0), 0);
    const types = new Set(documents.map((doc) => doc.type ?? 'other')).size;
    return { count: documents.length, types, totalSize };
  }, [documents]);

  const handleOpenDocument = async (document: CandidateDocumentRecord) => {
    const targetUrl = document.url ?? (document.storagePath ? await resolveStoragePathUrl(document.storagePath) : undefined);
    if (!targetUrl) {
      Alert.alert('Document', 'Aucune URL disponible pour ce document.');
      return;
    }
    try {
      const supported = await Linking.canOpenURL(targetUrl);
      if (!supported) {
        Alert.alert('Document', 'Aucun outil compatible pour ouvrir ce document.');
        return;
      }
      await Linking.openURL(targetUrl);
    } catch (_error) {
      Alert.alert('Document', "Le document n'a pas pu être ouvert.");
    }
  };

  const handleDeleteDocument = async (document: CandidateDocumentRecord) => {
    Alert.alert("Supprimer ce document ?", "", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteCandidateDocument(document.path, document.id ?? document.path);
            setDocuments((current) =>
              current.filter((item) => (item.id ?? item.path ?? item.storagePath) !== (document.id ?? document.path ?? document.storagePath))
            );
            Alert.alert("Document", "Document supprimé.");
          } catch (_error) {
            Alert.alert("Suppression", "Le document n'a pas pu être supprimé.");
          }
        },
      },
    ]);
  };

  debugDuplicateKeys('CandidateDocumentsScreen', 'documents', documents, (document) => document?.id ?? document?.path ?? document?.storagePath);
  debugExactUuidInList('CandidateDocumentsScreen', 'documents', documents, (document) => document?.id ?? document?.path ?? document?.storagePath, 'f4f29e28-f276-40e4-bbfa-553acd7cdf94');

  const handlePickDocument = async () => {
    if (selectedType === "other" && !customType.trim()) {
      Alert.alert("Nom du document", "Veuillez saisir un libellé.");
      return;
    }

    // Check if document of this type already exists
    const existingDoc = documents.find(
      (doc) => (doc.type ?? 'other') === selectedType
    );

    if (existingDoc) {
      // Show confirmation dialog for replacement
      const docTypeName = selectedType === "other" ? customType.trim() : getCandidateDocumentTypeLabel(selectedType);
      Alert.alert(
        `Remplacer ${docTypeName}?`,
        `Un document de type "${docTypeName}" est déjà présent. Voulez-vous le remplacer ?`,
        [
          {
            text: 'Annuler',
            style: 'cancel',
          },
          {
            text: 'Remplacer',
            onPress: async () => {
              await openFilePickerAndUpload(existingDoc);
            },
            style: 'default',
          },
        ]
      );
      return;
    }

    // No existing document, proceed directly to file picker
    await openFilePickerAndUpload();
  };

  const openFilePickerAndUpload = async (existingDoc?: CandidateDocumentRecord) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      
      // Use file size from DocumentPicker
      const actualFileSize = asset.size ?? 0;
      
      const validation = validateCandidateDocumentFile({
        mimeType: asset.mimeType ?? 'application/pdf',
        size: actualFileSize,
      });

      if (!validation.valid) {
        Alert.alert("Document", validation.error ?? "Le document est invalide.");
        return;
      }

      setIsUploading(true);

      try {
        // Delete existing document if we're replacing
        if (existingDoc) {
          try {
            await deleteCandidateDocument(existingDoc.path, existingDoc.id);
          } catch (deleteErr) {
            console.warn('Failed to delete old document:', deleteErr);
          }
        }

        if (selectedType === "cv") {
          await saveCandidateCv({
            uri: asset.uri,
            name: asset.name ?? "cv.pdf",
            mimeType: asset.mimeType ?? 'application/pdf',
            size: actualFileSize,
          });
        } else {
          await uploadCandidateDocument({
            uri: asset.uri,
            name: asset.name ?? "document.pdf",
            mimeType: asset.mimeType ?? 'application/pdf',
            size: actualFileSize,
            type: selectedType,
            customType: selectedType === "other" ? customType.trim() : undefined,
            displayName: selectedType === "other" ? customType.trim() : getCandidateDocumentTypeLabel(selectedType),
          });
        }

        await loadDocuments();
        setIsUploadModalVisible(false);
        setCustomType('');
        setSelectedType("cv");
        Alert.alert("Document", "Document ajouté avec succès.");
      } finally {
        setIsUploading(false);
      }
    } catch (error: any) {
      const message = String(error?.message ?? "Impossible d'ajouter le document.");
      Alert.alert("Document", message);
      setIsUploading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00009e" />
        <Text style={styles.loadingText}>Chargement…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#00009e" />
        </TouchableOpacity>
        <Text style={styles.title}>Documents</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#00009e" />}
      >
        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statCount}>{stats.count}</Text>
            <Text style={styles.statLabel}>Document{stats.count > 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statCount}>{stats.types}</Text>
            <Text style={styles.statLabel}>Type{stats.types > 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statCount} numberOfLines={1}>{formatBytes(stats.totalSize)}</Text>
            <Text style={styles.statLabel}>Utilisé</Text>
          </View>
        </View>

        {/* Document Type Coverage */}
        <View>
          <Text style={styles.sectionTitle}>Couverture</Text>
          <View style={styles.typesContainer}>
            <TouchableOpacity 
              style={styles.scrollButton} 
              onPress={handleScrollLeft}
              hitSlop={12}
            >
              <Ionicons name="chevron-back" size={20} color="#00009e" />
            </TouchableOpacity>
            
            <ScrollView 
              ref={typesScrollRef}
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.typesScroll}
              scrollEventThrottle={16}
              onScroll={(event) => setTypesScrollX(event.nativeEvent.contentOffset.x)}
              contentContainerStyle={styles.typesScrollContent}
            >
              {CANDIDATE_DOCUMENT_TYPES.map((item, index) => {
              const hasDocument = documents.some((doc) => (doc.type ?? 'other') === item.value);
              return (
                <View key={`${item.value}-${index}`} style={[styles.typeBadge, hasDocument && styles.typeBadgeActive]}>
                  <Ionicons name={hasDocument ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={hasDocument ? '#e8a900' : '#d1d5db'} />
                  <Text style={[styles.typeBadgeText, hasDocument && styles.typeBadgeTextActive]} numberOfLines={1}>
                    {item.label}
                  </Text>
                </View>
              );
            })}
            </ScrollView>
            
            <TouchableOpacity 
              style={styles.scrollButton} 
              onPress={handleScrollRight}
              hitSlop={12}
            >
              <Ionicons name="chevron-forward" size={20} color="#00009e" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Documents List */}
        {error ? (
          <View style={styles.alertCard}>
            <Ionicons name="alert-circle" size={24} color="#dc2626" />
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>Erreur</Text>
              <Text style={styles.alertText}>{error}</Text>
            </View>
          </View>
        ) : documents.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyTitle}>Aucun document</Text>
            <Text style={styles.emptyText}>Commencez par ajouter votre CV</Text>
          </View>
        ) : (
          <View style={styles.documentList}>
            {documents.map((document) => (
              <View key={`${document.id ?? document.path}`} style={styles.documentCard}>
                <Ionicons name="document-text" size={20} color="#00009e" style={{ marginRight: 12 }} />
                <View style={styles.documentInfo}>
                  <Text style={styles.documentName} numberOfLines={1}>{document.displayName || document.name}</Text>
                  <Text style={styles.documentMeta}>{formatBytes(document.size)}</Text>
                </View>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => handleOpenDocument(document)}
                  hitSlop={8}
                >
                  <Ionicons name="open-outline" size={18} color="#00009e" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => handleDeleteDocument(document)}
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={() => setIsUploadModalVisible(true)} activeOpacity={0.8}>
        <Ionicons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>

      {/* Upload Modal */}
      <Modal transparent visible={isUploadModalVisible} animationType="slide" onRequestClose={() => setIsUploadModalVisible(false)}>
        <TouchableOpacity activeOpacity={1} style={styles.modalBackdrop} onPress={() => setIsUploadModalVisible(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajouter un document</Text>
              <TouchableOpacity onPress={() => setIsUploadModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Type de document</Text>
              <ScrollView
                style={styles.optionScroll}
                contentContainerStyle={styles.optionsList}
                showsVerticalScrollIndicator={true}
                indicatorStyle="black"
              >
                {CANDIDATE_DOCUMENT_TYPES.map((item, index) => (
                  <TouchableOpacity
                    key={`${item.value}-${index}`}
                    onPress={() => setSelectedType(item.value)}
                    style={[styles.optionItem, selectedType === item.value && styles.optionItemActive]}
                  >
                    <Ionicons name={selectedType === item.value ? 'radio-button-on' : 'radio-button-off'} size={20} color={selectedType === item.value ? '#00009e' : '#d1d5db'} />
                    <Text style={[styles.optionItemText, selectedType === item.value && styles.optionItemTextActive]}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {selectedType === 'other' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.modalLabel}>Nom du document</Text>
                  <TextInput
                    value={customType}
                    onChangeText={setCustomType}
                    placeholder="Ex: Certificat de langue"
                    placeholderTextColor="#9ca3af"
                    style={styles.input}
                  />
                </View>
              )}

              <Text style={styles.helperText}>PDF max {MAX_DOCUMENT_SIZE_BYTES / (1024 * 1024)} Mo</Text>

              <View style={styles.primaryButtonContainer}>
                <TouchableOpacity style={[styles.primaryButton, isUploading && styles.primaryButtonDisabled]} disabled={isUploading} onPress={handlePickDocument}>
                  {isUploading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryButtonText}>Sélectionner un PDF</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    color: '#4b5563',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 16,
    paddingTop: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statCount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#00009e',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  typesScroll: {
    flex: 1,
  },
  typesScrollContent: {
    paddingHorizontal: 8,
    gap: 8,
  },
  typesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scrollButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f4ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e0e5ff',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  typeBadgeActive: {
    backgroundColor: '#eef2ff',
  },
  typeBadgeText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    maxWidth: 80,
  },
  typeBadgeTextActive: {
    color: '#00009e',
  },
  alertCard: {
    flexDirection: 'row',
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 12,
    gap: 12,
    alignItems: 'flex-start',
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991b1b',
    marginBottom: 2,
  },
  alertText: {
    fontSize: 13,
    color: '#7f1d1d',
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4b5563',
  },
  emptyText: {
    fontSize: 13,
    color: '#9ca3af',
  },
  documentList: {
    gap: 8,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  documentMeta: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  iconButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#00009e',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  optionScroll: {
    maxHeight: 220,
    borderRadius: 10,
  },
  optionsList: {
    gap: 8,
    paddingBottom: 4,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  optionItemActive: {
    backgroundColor: '#eef2ff',
    borderColor: '#00009e',
  },
  optionItemText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '600',
  },
  optionItemTextActive: {
    color: '#00009e',
  },
  inputGroup: {
    gap: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
  },
  primaryButtonContainer: {
    marginTop: 4,
    backgroundColor: '#ffffff',
    paddingTop: 8,
  },
  primaryButton: {
    backgroundColor: '#00009e',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});
