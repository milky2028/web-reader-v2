#include <archive.h>
#include <archive_entry.h>

void extract_file(const void* file, void on_success(void), void on_error(void)) {
  auto return_code = ARCHIVE_OK;
  auto working_archive = archive_read_new();

  archive_read_support_filter_all(working_archive);
  // archive_read_support_format_all(working_archive);

  archive_read_support_format_rar5(working_archive);
  archive_read_support_format_rar(working_archive);
  archive_read_support_format_zip(working_archive);
  archive_read_support_format_zip_seekable(working_archive);
  archive_read_support_format_zip_streamable(working_archive);

  return_code = archive_read_open_memory(working_archive, file, sizeof(file));
  if (return_code != ARCHIVE_OK) {
    on_error();
  }

  archive_read_free(working_archive);
}

void on_success() {}
void on_error() {}

int main() {
  void* data = NULL;
  extract_file(data, on_success, on_error);
}