<?php
/**
 * Plugin Name: Figma Variables
 * Plugin URI:  https://coindesign.ir
 * Description: Display JSON data as styled documentation with an accordion layout.
 * Version:     6.7
 * Author:      Dariush Habibpour
 * Author URI:  https://coindesign.ir
 */
 
// Add admin menu
add_action('admin_menu', function () {
    add_menu_page('Figma Variables', 'JSON Manager', 'manage_options', 'json-manager', 'json_manager_admin_page');
});

// Handle JSON uploads
add_action('admin_post_upload_json', function () {
    if (!current_user_can('manage_options')) {
        wp_die('Unauthorized user');
    }
    
    if (!empty($_FILES['json_file']['name'])) {
        $upload_dir = wp_upload_dir()['basedir'] . '/json_manager/';
        if (!is_dir($upload_dir)) {
            mkdir($upload_dir, 0755, true);
        }
        $file_name = basename($_FILES['json_file']['name']);
        $file_path = $upload_dir . $file_name;

        if (move_uploaded_file($_FILES['json_file']['tmp_name'], $file_path)) {
            $uploads = get_option('json_manager_files', []);
            $file_id = uniqid();
            $uploads[] = ['id' => $file_id, 'name' => $file_name];
            update_option('json_manager_files', $uploads);
            wp_redirect(admin_url('admin.php?page=json-manager&success=true'));
            exit;
        }
    }
    wp_redirect(admin_url('admin.php?page=json-manager&error=true'));
    exit;
});

// Handle JSON deletion
add_action('admin_post_delete_json', function () {
    if (!current_user_can('manage_options')) {
        wp_die('Unauthorized user');
    }

    $uploads = get_option('json_manager_files', []);
    $uploads = array_filter($uploads, function ($file) {
        return $file['id'] !== $_POST['delete_json'];
    });
    update_option('json_manager_files', $uploads);
    wp_redirect(admin_url('admin.php?page=json-manager'));
    exit;
});

// Render admin page
function json_manager_admin_page()
{
    $uploads = get_option('json_manager_files', []);
    ?>
    <div class="wrap">
        <h1>Figma Variables</h1>
        <p>Export your JSON with "variables2css" plugin in your figma design system file and upload it here. After the upload, insert it's shortcode anywhere in your website.</p>
        <form method="post" enctype="multipart/form-data" action="<?php echo admin_url('admin-post.php'); ?>">
            <input type="hidden" name="action" value="upload_json">
            <input type="file" name="json_file" accept=".json" required>
            <button type="submit" class="button button-primary">Upload JSON</button>
        </form>
        <h2>جیسون‌های من</h2>
        <table class="widefat fixed">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Shortcode</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($uploads as $file): ?>
                    <tr>
                        <td><?php echo esc_html($file['name']); ?></td>
                        <td>[json_palette id="<?php echo esc_attr($file['id']); ?>"]</td>
                        <td>
                            <form method="post" action="<?php echo admin_url('admin-post.php'); ?>" style="display:inline;">
                                <input type="hidden" name="action" value="delete_json">
                                <input type="hidden" name="delete_json" value="<?php echo esc_attr($file['id']); ?>">
                                <button type="submit" class="button button-secondary">Delete</button>
                            </form>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
    <?php
}

// Register shortcode
add_shortcode('json_palette', function ($atts) {
    $atts = shortcode_atts(['id' => ''], $atts, 'json_palette');
    $uploads = get_option('json_manager_files', []);

    foreach ($uploads as $file) {
        if ($file['id'] === $atts['id']) {
            $json_url = wp_upload_dir()['baseurl'] . '/json_manager/' . $file['name'];
            wp_enqueue_script('figma-color-palette', plugin_dir_url(__FILE__) . 'js/script.js', [], '1.0.0', true);
            wp_enqueue_style('figma-color-palette', plugin_dir_url(__FILE__) . 'css/style.css', [], '1.0.0');
            wp_localize_script('figma-color-palette', 'pluginData', ['jsonUrl' => $json_url]);
            return '<div id="figma-color-palette"></div>';
        }
    }

    return '<p>Invalid JSON ID specified.</p>';
});