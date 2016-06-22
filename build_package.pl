#!/usr/bin/env perl

use strict;
use warnings;
use File::Slurp qw(slurp write_file);
use FindBin;
use Cwd qw(cwd);
use Digest::SHA1();

my $version = shift(@ARGV) or die <<"USAGE";

    USAGE: $0 \$Plugin_Version

USAGE

# Build JS
my $home_dir = "$FindBin::RealBin";
chdir($home_dir);
system('./build_js.pl') && die $!;

# Update version in descriptor
my $descriptor = slurp('plugin-descriptor.properties');
$descriptor =~ s/^version=.*/version=$version/m;
write_file( 'plugin-descriptor.properties', $descriptor );

# Update version in index.html
my $html = slurp('_site/index.html');
$html =~ s{<h1>(.+) v\d[-\w.]+</h1>}{<h1>$1 v$version</h1>};
write_file( '_site/index.html', $html );

# Update version in README.asciidoc
my $readme = slurp('README.asciidoc');
$readme =~ s{^(== .+)v\d.+}{$1v$version}m;
$readme
    =~ s{(download/v)[^/]+(/elasticsearch-migration-).+(\.zip)}{$1$version$2$version$3}g;
write_file( 'README.asciidoc', $readme );

# Build ZIP
chdir("$home_dir");
system(
    'zip',                                  '-r',
    "elasticsearch-migration-$version.zip", ".",
    "-i",                                   "LICENSE.txt",
    "-i",                                   "README.asciidoc",
    "-i",                                   "_site/\*",
    "-i", "plugin-descriptor.properties",
    "-x", "\*/.\*",
    "-x", "\*/.DS_Store",
) && die $!;

# Add SHA1 signature
my $sha1 = Digest::SHA1->new;
open my $fh, '<:raw', "elasticsearch-migration-$version.zip";
$sha1->addfile($fh);

open $fh, '>', "elasticsearch-migration-$version.zip.sha1";
print $fh $sha1->hexdigest;
close $fh;
