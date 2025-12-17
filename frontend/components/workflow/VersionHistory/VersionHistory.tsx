"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { VersionHistoryProps } from "./interface";
import { useVersionHistoryController } from "./controller";

export function VersionHistory({
  isOpen,
  onClose,
  workflowId,
  versions,
  currentVersion,
  isLoading,
  viewingVersion = null,
  onRestore,
  onView,
  onRefresh,
}: VersionHistoryProps) {
  const {
    restoringVersion,
    showConfirmDialog,
    formatDate,
    handleRestoreClick,
    handleConfirmRestore,
    handleCancelRestore,
    handleViewClick,
  } = useVersionHistoryController({
    isOpen,
    onClose,
    workflowId,
    versions,
    currentVersion,
    isLoading,
    viewingVersion,
    onRestore,
    onView,
    onRefresh,
  });

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Version History"
        size="lg"
      >
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              Loading versions...
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No versions found. Versions will be created automatically when you
              save changes.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm text-gray-600 mb-4">
                Current version:{" "}
                <span className="font-semibold">v{currentVersion}</span>
                {viewingVersion && viewingVersion !== currentVersion && (
                  <span className="ml-3 px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                    Currently Viewing: v{viewingVersion}
                  </span>
                )}
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-transparent">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Version
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Created At
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-transparent divide-y divide-gray-200">
                    {versions.map((version) => {
                      const isCurrent =
                        version.versionNumber === currentVersion;
                      const isRestoring =
                        restoringVersion === version.versionNumber;
                      const isViewing =
                        viewingVersion === version.versionNumber;

                      return (
                        <tr
                          key={version.id}
                          className={
                            isViewing
                              ? "bg-yellow-50 border-l-4 border-yellow-400"
                              : isCurrent
                              ? "bg-blue-50"
                              : "hover:bg-gray-50"
                          }
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <span className="text-sm font-medium text-gray-900">
                                v{version.versionNumber}
                              </span>
                              {isCurrent && (
                                <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                                  Current
                                </span>
                              )}
                              {isViewing && (
                                <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                                  Viewing
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-900">
                              {version.name}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {formatDate(version.createdAt)}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              {!isCurrent && (
                                <>
                                  <Button
                                    onClick={() =>
                                      handleViewClick(version.versionNumber)
                                    }
                                    disabled={isViewing || isRestoring}
                                    className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
                                    variant="outline"
                                    size="sm"
                                  >
                                    {isViewing ? "Viewing..." : "View"}
                                  </Button>
                                  <Button
                                    onClick={() =>
                                      handleRestoreClick(version.versionNumber)
                                    }
                                    disabled={
                                      isRestoring || restoringVersion !== null
                                    }
                                    className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                                    variant="ghost"
                                    size="sm"
                                  >
                                    {isRestoring ? "Restoring..." : "Restore"}
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Confirmation Dialog */}
      {showConfirmDialog !== null && (
        <Modal
          isOpen={true}
          onClose={handleCancelRestore}
          title="Confirm Restore"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              Are you sure you want to restore version{" "}
              <strong>v{showConfirmDialog}</strong>?
            </p>
            <p className="text-sm text-gray-500">
              The current workflow will be saved as a new version before
              restoring.
            </p>
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                onClick={handleCancelRestore}
                variant="ghost"
                disabled={restoringVersion !== null}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmRestore}
                disabled={restoringVersion !== null}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {restoringVersion !== null ? "Restoring..." : "Restore"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
